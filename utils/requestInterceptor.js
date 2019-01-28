const blacklist = [
  /.(jpg|gif|png|css)/,
  /.*sb.scorecardresearch.com.*/,
  /.*mail.ru*/,
  /.*counter.yadro.ru*/
]

export default function requestInterceptor(e) {
  if (blacklist.find(item => item.test(e.url()))) {
    e.abort()
  } else {
    e.continue()
  }
}