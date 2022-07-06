import {
  DocumentType,
  getModelForClass,
  plugin,
  prop,
} from '@typegoose/typegoose'
import { FindOrCreate } from '@typegoose/typegoose/lib/defaultClasses'
import { floor, random } from 'mathjs'
import { connect } from 'mongoose'

export interface Example {
  englishExample: string
  russianExample: string
}
export interface testQuestion {
  question: string
  example: string
  incorrectAnswer1: string | undefined
  incorrectAnswer2: string | undefined
  rightAnswer: string | undefined
}

export class Word extends FindOrCreate {
  @prop({ required: true, index: true, unique: true })
  englishWord!: string

  @prop({ index: true })
  transcription?: string

  @prop({ default: [], type: String })
  translates?: string[]

  @prop({ required: true, default: [] })
  examples!: Example[]

  @prop()
  testQuestion?: testQuestion

  public async makeTestQuestion(
    this: DocumentType<Word>
  ): Promise<testQuestion> {
    const question = 'Как перевести слово: ' + this.englishWord + '?'
    let example = ''
    if (this.examples[0]) {
      example = this.examples[0].englishExample
    }

    const answer1 = await findRandomWord()
    let incorrectAnswer1
    if (answer1.translates) {
      incorrectAnswer1 = answer1.translates[0]
    }
    const answer2 = await findRandomWord()
    let incorrectAnswer2
    if (answer2.translates) {
      incorrectAnswer2 = answer2.translates[0]
    }
    const translate = this.translates
    let rightAnswer
    if (translate) {
      rightAnswer = translate[0]
    }
    return {
      question,
      example,
      incorrectAnswer1,
      incorrectAnswer2,
      rightAnswer,
    }
  }
}

export const WordModel = getModelForClass(Word)

export async function findRandomWord(): Promise<DocumentType<Word>> {
  const words = await WordModel.find({})
  const randomIndex = floor(random() * 2800)
  return words[randomIndex]
}

export async function findOrCreateWord(
  englishWord: string,
  transcription: string | undefined,
  translates: string[] | string | undefined,
  examples: { englishExample: string; russianExample: string }[],
  addDate: Date
) {
  return await WordModel.findOrCreate({
    englishWord,
    transcription,
    translates,
    examples,
    addDate,
  })
}

export function startMongo() {
  const mongoUrl = 'mongodb://localhost:27017/wordydbcambrige'
  return connect(mongoUrl)
}
