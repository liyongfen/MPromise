const REJECTED = 'rejected';
const RESOLVED = 'resolved';
const PENDING = 'pending';

function getThen(obj) {
    const then = obj && obj.then;
    if (obj && typeof obj === 'object' && typeof then === 'function') {
        return function applyThen() {
            then.apply(obj, arguments);//传入obj非常重要，让后面调用在obj环境中
        }
    }
}
function executeCallback(type, x) { //同步的回调
    const isResolve = type === 'resolve';
    let thenable;

    if (isResolve && (typeof x === 'object' || typeof x === 'function')) {
        try {
            thenable = getThen(x);
        } catch (e) {
            return executeCallback.call(this, 'reject', e);
        }
    }
    if (isResolve && thenable) {
        executeResolver.call(this, thenable);
    } else { //改变状态，按顺序执行回调
        this.state = isResolve ? RESOLVED : REJECTED;
        this.data = x;
        this.callbackQueue.forEach((v) => v[type](x));
    }
    return this;
}

function executeCallbackAsync(callback, value) { //异步回调-> 同步回调
    var _this = this;
    setTimeout(function () {
        let res
        try {
            res = callback(value);
        } catch (e) {
            return executeCallback.call(_this, 'reject', e);
        }

        if (res !== _this) {
            return executeCallback.call(_this, 'resolve', res);
        } else {
            return executeCallback.call(_this, 'reject', new TypeError('Cannot resolve promise with itself'));
        }
    }, 4);
}

function executeResolver(resolver) {
    let called = false;
    let _this = this;

    function onError(reason) {//改变状态的方法
        if (called) {
            return;
        }
        called = true;
        executeCallback.call(_this, 'reject', reason);
    }
    function onSuccess(value) {//改变状态的方法
        if (called) {
            return;
        }
        called = true;
        executeCallback.call(_this, 'resolve', value); //指定this是关键
    }

    try {
        resolver(onSuccess, onError);
    } catch (e) {
        onError(e)
    }
}

class CallbackItem {
    constructor(promise, onResolved, onRejected) {
        this.promise = promise;
        this.onResolved = typeof onResolved === 'function' ? onResolved : function (v) {
            return v;
        };
        this.onRejected = typeof onRejected === 'function' ? onRejected : function (v) {
            throw v;
        };
    }
    resolve(value) {
        executeCallbackAsync.call(this.promise, this.onResolved, value);
    }
    reject(value) {
        executeCallbackAsync.call(this.promise, this.onRejected, value);
    }
}
////////////////////////////////////////////////////////////////////////

class MPromise {
    constructor(resolver) {
        if (resolver && typeof resolver !== 'function') {
            throw new Error('MPromise resolver is not function');
        }
        this.data = undefined;
        this.state = PENDING;
        this.callbackQueue = [];
        if (resolver) {
            executeResolver.call(this, resolver);
        }
    }
    then(onResolved, onRejected) {

        if (typeof onResolved !== 'function' && this.state === RESOLVED ||
            typeof onRejected !== 'function' && this.state === REJECTED) {
            return this;
        }

        let promise = new MPromise();

        if (this.state !== PENDING) {//下一个轮询执行回调
            var callback = this.state === RESOLVED ? onResolved : onRejected;
            //注意：传入promise，
            //执行then中的回调，并传入值，并传递新的promise起到衔接作用
            executeCallbackAsync.call(promise, callback, this.data);
        } else { //放入队列中，等待状态的改变
            this.callbackQueue.push(new CallbackItem(promise, onResolved, onRejected))
        }
        return promise;
    }
    static resolve(value) {
        if (value instanceof this) {
            return value;
        }
        return executeCallback.call(new MPromise(), 'resolve', value);
    }
    static reject(reason) {
        if (reason instanceof this) {
            return reason;
        }
        return executeCallback.call(new MPromise(), 'reject', reason);
    }
    static all(iterable) {
        return new MPromise((resolve, reject) => {
            if (!iterable || !Array.isArray(iterable)) {
                return reject(new TypeError('all param must be an array'))
            }
            const len = iterable.length;
            let result = Array(len);
            let called = false;
            let current = 0;

            if (len == 0) {
                return resolve([]);
            }
            iterable.forEach((v, i) => {
                MPromise.resolve(v).then((value) => {
                    result[i] = value;
                    current++;
                    if (!called && current == len) {
                        called = true;
                        resolve(result);
                    }
                }, (err) => {
                    if (!called) {
                        called = true;
                        return reject(err);
                    }
                });
            });
        });
    }
    static race(iterable) {//如果某个promise的状态率先改变，就获得改变的结果，返回一个新的Promise对象
        return new MPromise((resolve, reject) => {
            if (!iterable || !Array.isArray(iterable)) {
                return reject(new TypeError('race param must be an array'))
            }
            const len = iterable.length;
            let called = false;

            if (len == 0) {
                return resolve();
            }
            iterable.forEach((v, i) => {
                MPromise.resolve(v).then((value) => {

                    if (called) return;
                    called = true;
                    return resolve(value);
                }, (reason) => {

                    if (called) return;
                    called = true;
                    return reject(reason);
                });
            });
        });
    }
    //这里利用，then 方法中对状态的要求必须不是 Pending 状态的处理才会立即执行回调，
    //在 promise链 中返回一个初始状态的 Promise对象，便可以中断后面回调的执行。
    static stop(){
        return new Promise();
    }
    static deferred() { //Deferred 的简称，叫延迟对象，其实是 new Promise() 的语法糖
        let defer = {};
        defer.promise = new MPromise((resolve, reject) => {
            defer.resolve = resolve;
            defer.reject = reject;
        });
        return defer;
    }
    //用于判断某些promise任务是否超时
    //如一个异步请求，如果超时，取消息请求，提示消息或重新请求
    static timeout(promise, ms){
        return this.race([promise, this.reject().wait(ms)]);
    }
    //用于按顺序执行一系列的promise，接收的函数数组，并不是Promise对象数组，其中函数执行时就返回Promise对象，
    //用于有互相依赖的promise任务
    static sequence(tasks){
        if (!Array.isArray(tasks)){
            throw new TypeError('sequence param must be an array');
        }
        return tasks.reduce((prev, next)=> {
            return prev.then(next).then((v)=> v);
        }, this.resolve());
    }
    catch(onRejected) {
        return this.then(null, onRejected);
    }
    wait(ms) { //保证链式调用，必须返回新的promise，并且上一步的成功和失败的消息不能丢失，继续向后传递，这里只做延迟处理
        return this.then((value)=>{
           return new MPromise(function (resolve, reject) {
               setTimeout(() => resolve(value), ms);
           });
        }, (reason)=>{
            return new MPromise(function(resolve, reject){
                setTimeout(() => reject(reason), ms);
            });
        });
    }
    always(fn) { //无论成功还是失败最终都会调用 always 中注册的回调
        return this.then((value)=>{
            return fn(value), value;
        }, (reason) => {
            throw fn(reason), reason;
        });
    }
    done(onResolved, onRejected) {
        //done方法并不返回promise对象，也就是done之后不能使用 then或catch了，
        //其主要作用就是用于将 promise链 中未捕获的异常信息抛至外层，并不会对错误信息进行处理。
        //done方法必须应用于promise链的最后
        this.then(onResolved, onRejected).catch((error)=> {
            setTimeout(() => {
                throw error;
            }, 0);
        });
    }
}