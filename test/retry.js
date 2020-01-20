function fn1() {
    return new MPromise((resolve, reject) => {
        setTimeout(() => {
            const num = Math.random();
            console.log('num:', num);
            num > 0.5 ? resolve('resolve') : reject('reject')
        }, 500);
    });
}


MPromise.retry(fn1, function (reason, retries) { //onFail
    if (retries){
        console.log('还有', retries, '次:', reason,);
    } else {
        console.log('次数用完还是失败：', reason, retries);
    }
} , {
    limit: 2,
}).then((value)=>{
    console.log(value);
});



// fn1.then(res => {
//     console.log(res);
//     return 'xxxx';
// }, err => {
//     console.log(err);
// }).wait(3000).then(function (res) {
//     console.log(res);
// });