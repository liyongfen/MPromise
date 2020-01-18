function fn1() {
    return new MPromise(resolve => {
        setTimeout(() => {
            resolve(1)
        }, 1000)
    });
}
function fn2(data) {
    return new MPromise(resolve => {
        setTimeout(() => {
            resolve(data + 5)
        }, 1000)
    });
}

MPromise.sequence([fn1, fn2]).then(res => {
    console.log(res);
    return 'xxxx';
}, err => {
    console.log(err);
}).wait(3000).then(function (res) {
    console.log(res);
});