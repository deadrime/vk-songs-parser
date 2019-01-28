export default function formatName(str) {
  return str
    .trim()
    .replace(/[\/\.\`\'\+\=\[\]\:\;\«\»\"\?\\\<\>\|\*]/g, '')
    .substring(0, 40)
}