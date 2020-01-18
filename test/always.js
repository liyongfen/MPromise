function fn1() {
    return new MPromise(resolve => setTimeout(() => resolve(1), 1000))
}
function fn2() {
    return new MPromise((resolve, reject) => setTimeout(() => reject(2), 1000))
}
MPromise.all([fn1(), fn2()]).then(res => {
    console.log(res);
    return 'xxxx';
}, err => {
    console.log(err);
    return 'error'
}).wait(3000).always(function (res) {
    console.log(res);
    throw 'yyy';
}).then((res)=>{
    console.log(res);
}, (r)=> {
    console.log(r);
})