function fn1() {
    return new MPromise(resolve => setTimeout(() => resolve(1), 1010))
}
function fn2() {
    return new MPromise(resolve => setTimeout(() => resolve(2), 1000))
}
MPromise.race([fn1(), fn2()]).then(res => {
    console.log(res);
    return 'xxxx';
}, err => {
    console.log(err);
}).wait(3000).then(function (res) {
    console.log(res);
});