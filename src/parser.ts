import fetch from 'node-fetch'
import * as cheerio from 'cheerio'
import { WordModel } from './models/Word'
import * as fs from 'fs'
import axios from 'axios'
import { Proxy } from 'proxy/checkProxy'

const partOfSpeech_sel = 'span.pos.dpos'
const transcription_sel = 'span.ipa.dipa.lpr-2.lpl-1'
const translates_sel = 'div.pr.dsense '
const translate_sel = 'span.trans.dtrans.dtrans-se '
const example_sel = 'div.examp.dexamp'

let unDoneWords: string[] = []

let proxyies: Proxy[] | undefined = undefined
let workProxy: Proxy
let num: number = 0

async function parseDict(word: string) {
  const html = await parseHtml(word)
  const $ = cheerio.load(html)
  const wordMeanings = $('div.pr.entry-body__el')
  const numOfMeanings = wordMeanings.length

  let transcription
  let translates = []
  let examples = []

  for (let i = 0; i < numOfMeanings; i++) {
    const html = cheerio.html(wordMeanings[i])
    const speech = cheerio.load(html)
    const partOfSpeech = speech(partOfSpeech_sel).text()
    if (!transcription) {
      transcription = speech(transcription_sel).text()
    }

    const translationsOfSpeech = speech(translates_sel)
    const transForDel = speech('div.pr.dsense.dsense-noh')
    const numOfTranslations =
      translationsOfSpeech.length <= transForDel.length
        ? translationsOfSpeech.length
        : translationsOfSpeech.length - transForDel.length
    let translateOneSpeach = partOfSpeech + ': '

    for (let i = 0; i < numOfTranslations; i++) {
      const html_trans = cheerio.html(translationsOfSpeech[i])
      const translateMeaning = cheerio.load(html_trans)
      let oneTranslate = translateMeaning(translate_sel).text()
      if (oneTranslate[oneTranslate.length - 1] == ' ') {
        oneTranslate = oneTranslate.slice(0, -1)
      }
      if (i != numOfTranslations - 1) {
        oneTranslate += ', '
      }
      translateOneSpeach += oneTranslate

      const examplesOfOneMeaning = translateMeaning(example_sel)
      let numOfExamples = 0
      if (examplesOfOneMeaning.length > 0) {
        for (let example of examplesOfOneMeaning) {
          if (numOfExamples >= 1 || examples.length >= 5) {
            break
          }
          const html = cheerio.html(example)
          const exampleToPush = cheerio.load(html)
          const englishExample = exampleToPush('span').text()
          const russianExample = await parseTranslate(englishExample)
          if (!russianExample) {
            continue
          }
          numOfExamples += 1
          examples.push({ englishExample, russianExample })
        }
      } else {
        const examplesBlock = $('div.degs.had.lbt.lb-cm')
        const html = cheerio.html(examplesBlock)
        const examplesBlockHtml = cheerio.load(html)
        const examplesHtml = examplesBlockHtml('div.lbb.lb-cm.lpt-10')
        for (const example of examplesHtml) {
          if (examples.length > 4) {
            continue
          }
          const html = cheerio.html(example)
          const exampleParse = cheerio.load(html)
          const englishExample = exampleParse('span.deg')
            .text()
            .replaceAll('\n', '')
            .trim()
          const russianExample = await parseTranslate(englishExample)
          if (!russianExample) {
            continue
          }
          numOfExamples += 1
          examples.push({ englishExample, russianExample })
        }
      }
    }

    translates.push(translateOneSpeach)
  }
  if (!transcription) {
    unDoneWords.push(word)
    console.log('Не добавлено в базу из за транскрипции: ' + word)
    console.log(unDoneWords)
  } else if (!translates[0]) {
    unDoneWords.push(word)
    console.log('Не добавлено в базу из за перевода: ' + word)
    console.log(unDoneWords)
  } else {
    const englishWord = word
    const today = new Date()
    await WordModel.create({
      englishWord,
      transcription,
      translates,
      examples,
      today,
    })
    console.log('Добавлено слово в БД:', word)
  }
}

async function parseHtml(word: string) {
  const url =
    'https://dictionary.cambridge.org/dictionary/english-russian/' + word
  let headers = {
    'User-Agent':
      'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Mobile Safari/537.36',
  }
  const response = await fetch(url, { method: 'GET', headers: headers })
  return response.text()
}

async function parseTranslate(
  phrase: string,
  proxy: Proxy | undefined = undefined
): Promise<string | undefined> {
  const data = JSON.stringify({
    q: phrase,
    source: 'en',
    target: 'ru',
  })
  const response = await axios.post('http://127.0.0.1:5000/translate', data, {
    headers: { 'Content-Type': 'application/json' },
  })
  const translateDone = response.data.translatedText
  return translateDone
}

async function getNewAgent() {
  if (!proxyies) {
    const jsonStr = fs.readFileSync('src/proxy/goodproxy.txt').toString()
    proxyies = JSON.parse(jsonStr)
    console.log(proxyies)
    if (proxyies) {
      workProxy = proxyies[0]
    }
  } else {
    if (num == 2) {
      num = 0
      proxyies.shift()
      workProxy = proxyies[0]
    } else {
      num += 1
      workProxy = proxyies[0]
    }
  }
}
