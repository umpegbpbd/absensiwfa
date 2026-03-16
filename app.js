async function loadData(){

let url = `https://api.github.com/repos/${CONFIG.OWNER}/${CONFIG.REPO}/contents/${CONFIG.DATA_FILE}`

let res = await fetch(url)

let data = await res.json()

let content = JSON.parse(atob(data.content))

return content

}
