let pool = new PromisePool((taskDataId, index)=> {
    const num = Math.random();
    console.log('random:', num);
   
    return MPromise.resolve().wait(500).then(function () {
        if (num < 0.5) {
            throw new Error('err 2');
        }
        return 'hello:' + taskDataId + ', index:' + index;
    });
}, 3, true);

for (var i = 0; i < 5; i++) {
    pool.add(i);
}

function onProgress(progress) {
    if (progress.success) {
        console.log(progress.fulfilled + '/' + progress.total, ' ', progress.success);
    } else {
        //5 retries left   还剩5次重试机会
        console.log('task ' + progress.index + ' failed with ' + (progress.error ? progress.error.message : progress.error) + ', ' + progress.retries + ' retries left.');
    }
}
pool.retries = 2;
pool.start(onProgress);
//pool.pause();