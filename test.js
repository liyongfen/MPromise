function fn() {
    //promise1的callbackQueue，放入CallbackItem：{promise, onResolved, onRejected}
    //其中onResolved=onSuccess, onSuccess->executeCallback的this指向promise2
    //更改promise2的状态

    function promise1() {
        return new MPromise((resolve) => {
            setTimeout(() => {
                resolve(1); //
            }, 1000);
        });
    }
    function promise2() {
        return new MPromise((resolve) => {
            setTimeout(() => {
                resolve('xxxx');
            }, 1);
        }).then(res => {
            console.log(res);
            return res;
        }).catch(err => {
            console.log(err);
        });
    }
    function promise3() {
        return new MPromise((reject) => {
            setTimeout(() => {
                reject(333);
            }, 1000);
        })
    }


    // MPromise.all([promise3(), promise1(), promise2()]).then((data)=>{
    //     console.log(data);
    // }).catch((err)=>{
    //     console.log(err);
    // });

    function fn1() {
        return new MPromise(resolve => setTimeout(() => resolve(1), 1000))
    }
    function fn2() {
        return new MPromise(resolve => setTimeout(() => resolve(2), 1000))
    }
    MPromise.all([fn1(), fn2()]).then(res => {
        console.log(res);
        return 'xxxx';
    }, err => {
        console.log(err);
    })
}
fn()
