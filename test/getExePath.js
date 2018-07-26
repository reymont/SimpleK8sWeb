function getExePath(extName) {
    var strPath = process.env['PATH']

    var nodePath = strPath.split(';').filter((str) => {
        if (str.toLowerCase(extName).indexOf(extName.toLowerCase()) > 0) {
            return true
        }
    }) || []

    return nodePath[0]
}
console.log(process.env)
console.log(getExePath('nodejs'))
console.log(getExePath('git'))
console.log(getExePath('kubectl'))
