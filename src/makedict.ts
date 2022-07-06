import { startMongo, WordModel } from '@/models/Word'
import * as fs from 'fs'
import parseDict from '@/parser'

startParsing().catch((err) => {
  console.log(err)
})

async function startParsing() {
  await startMongo()
  const wordsFromBd = await WordModel.find()
  console.log(wordsFromBd.length)
  const wordsFromFile = fs.readFileSync('words.txt', 'utf8').split(',')
  const words = wordsFromFile.filter(
    (word) => !wordsFromBd.map((w) => w.englishWord).includes(word)
  )
  for (const word of words) {
    await parseDict(word)
  }
}
