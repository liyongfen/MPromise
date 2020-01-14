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
    catch(onRejected) {
        return this.then(null, onRejected);
    }
}