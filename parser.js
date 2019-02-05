import puppeteer from 'puppeteer'
import cheerio from 'cheerio'
import { Signale } from 'signale'
import rp from 'request-promise'
import fs from 'fs'
import decodeSong from './utils/decode'
import requestInterceptor from './utils/requestInterceptor'
import formatName from './utils/formatName'
import config from './config'

const signale = new Signale()

export default class VKParser {
  constructor({ username, password }) {
    this.options = {
      username: username,
      password: password,
      setViewport: {
        isMobile: true,
        height: 800,
        width: 600,
      },
    }
    this.cookies = []
    this.browser = null
    this.page = null
    this.userId = null
  }

  async init() {
    this.browser = await puppeteer.launch(this.options)
    this.page = await this.browser.newPage()
    await this.page.setViewport(this.options.setViewport)
    await this.page.setRequestInterception(true)
    this.page.on('request', requestInterceptor)
    await this.login()
  }

  async login() {
    const usernameSelector = `input[name="email"]`
    const passwordSelector = `input[type="password"]`
    const buttonSelector = 'input[type="submit"]'
    await this.page.goto('https://m.vk.com/login')
    await this.page.waitForSelector(usernameSelector)
    await this.page.click(usernameSelector)
    await this.page.keyboard.type(this.options.username)
    await this.page.click(passwordSelector)
    await this.page.keyboard.type(this.options.password)
    await this.page.click(buttonSelector)
    this.cookies = await this.page.cookies()
      .then(data => data
        .filter(({ name }) => ['remixstid', 'remixgp', 'remixsid'].includes(name))
        .map(({ name, value }) => `${name}=${value};`)
        .join(' '))
    await this.page.goto('https://m.vk.com/')
    await this.page.waitFor(100)
    const content = await this.page.content()
    this.userId = cheerio.load(content)('a.op_owner').attr('href').split('/id')[1]
  }

  async parseUserSongs(id) {
    signale.time('Парсинг')
    let allSongs = []
    let offset = 0
    while (1) {
      let page = await rp({
        url: `https://m.vk.com/audios${id}`,
        method: 'get',
        qs: {
          offset
        },
        headers: {
          Cookie: this.cookies
        }
      })
      let songs = await this.parseSongsFromPage(cheerio.load(page), this.userId)
      if (!songs) {
        signale.timeEnd('Парсинг')
        return allSongs
      }
      allSongs = [...allSongs, ...songs]
      offset += songs.length
    }
  }

  parseSongsFromPage($, vkId) {
    let audios = $('#au_search_items').find('.audio_item')
    let result = []

    audios.each((_, audio) => {
      const artist = formatName($(audio).find('.ai_artist').text())
      const title = formatName($(audio).find('.ai_title').text())
      const duration = $(audio).find('.ai_dur').data('dur')
      const link = $(audio).find('.ai_body input').val()
      if (artist && title && duration) {
        if (vkId) {
          const mp3 = decodeSong(link, vkId)
          result.push({ artist, title, duration, mp3 })
        } else {
          const mp3 = null
          result.push({ artist, title, duration, mp3 })
        }
      }
    })
    if (result.length === 0) return null
    return result
  }

  async downloadSongs(songs) {
    const progressBar = new Signale({interactive: true, scope: 'downloading'})
    let downloadCount = 0
    const writer = require('m3u').extendedWriter()
    await Promise.all(songs.map(async ({artist, title, mp3, duration}) => {
      const options = {
        url: mp3,
        encoding: null
      }
      const result = await rp.get(options)
      progressBar.complete(`[${++downloadCount}/${songs.length}] ${artist} - ${title}`)
      const buffer = Buffer.from(result, 'utf8')
      const filePath = `${__dirname}/songs/${artist} - ${title}.mp3`
      fs.writeFileSync(filePath, buffer)
      writer.file(filePath, duration, `${artist} - ${title}`)
    }))

    fs.writeFileSync(`${__dirname}/songs/playlist.m3u`, writer.toString())
    progressBar.success(`[${songs.length}/${songs.length}]`)
    return songs
  }

  async saveToJSON(songs) {
    fs.writeFileSync('playlist.json', JSON.stringify(songs, null, 4))
    signale.complete('playlist.json')
    return songs
  }
}

const parser = new VKParser({
  username: config.login,
  password: config.password,
})

parser.init()
  .then(() => parser.parseUserSongs(config.page))
  .then(parser.saveToJSON)
  .then(parser.downloadSongs)
  .then(() => {
    process.exit()
  })