import * as fs from 'fs'
import axios from 'axios'

let proxyies: Proxy[] | undefined
let goodProxies: Proxy[] = []

export interface Proxy {
  protocol: string
  host: string
  port: number
}

writeGoodProxy().catch((err) => console.log(err))

async function writeGoodProxy() {
  const goodProxy = await findGoodProxy()
  console.log(goodProxy)
  const strJson = JSON.stringify(goodProxy)
  fs.writeFileSync('src/proxy/goodproxy.txt', strJson)
}

export async function findGoodProxy() {
  const httpProxy = fs
    .readFileSync('src/proxy/http.txt', 'utf8')
    .split('\n')
    .map((pr) => {
      const hostPort = pr.split(':')
      return {
        protocol: 'http',
        host: hostPort[0],
        port: Number(hostPort[1]),
      }
    })
  const httpsProxy = fs
    .readFileSync('src/proxy/https.txt', 'utf8')
    .split('\n')
    .map((pr) => {
      const hostPort = pr.split(':')
      return {
        protocol: 'https',
        host: hostPort[0],
        port: Number(hostPort[1]),
      }
    })

  proxyies = [...httpProxy, ...httpsProxy]

  const url =
    'https://dictionary.cambridge.org/ru/%D1%81%D0%BB%D0%BE%D0%B2%D0%B0%D1%80%D1%8C/%D0%B0%D0%BD%D0%B3%D0%BB%D0%BE-%D1%80%D1%83%D1%81%D1%81%D0%BA%D0%B8%D0%B9/home'
  const headers = {
    'User-Agent':
      'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.0.0 Mobile Safari/537.36',
  }

  await Promise.all(
    proxyies.map(async (proxy) => {
      try {
        const response = await axios.get(url, {
          headers,
          timeout: 15000,
          proxy,
        })
        if (response.status == 200) {
          goodProxies.push(proxy)
          console.log('Прокси ', proxy.host, ' готов к использованию')
        }
      } catch (err) {
        //   console.log('Прокси не принят: ', proxy.host);
      }
    })
  )
  return goodProxies
}
