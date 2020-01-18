function fn(){
    let deferred = MPromise.deferred();
    setTimeout(() => {
        deferred.resolve('xxxxxx');
    }, 3000);
    return deferred.promise;
}

fn().then((res) => {
    console.log(res);
})


