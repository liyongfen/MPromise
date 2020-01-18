function fn1() {
    return new MPromise(resolve => setTimeout(() => resolve(1), 1000))
}
function fn2() {
    return new MPromise(resolve => setTimeout(() => resolve(2), 3000))
}
MPromise.timeout(fn2(), 3000).catch(r => console.log(r));