/**
 * 任务队列
 * 1、支持暂停
 * 2、支持恢复
 * 3、支持重置
 * 4、支持重试
 * 5、支持进度
 */

class PromisePool{
    constructor(processor, concurrency, endless, tasksData){

        this.fulfilled = 0;
        this.rejected = 0;
        this.pendding = 0;
        this.total = 0;
        this._index = 0; //总的指针
        this._currentConcurrency = 0;//前并发指针
        this._tasksData = []; //任务队列
        this.onProgress = void 0;

        this.concurrency = concurrency; //并发数
        this.retries = 0; //重试的次数
        this.retryIntervalMultiplier = 1;
        this.maxRetryInterval = Infinity;
        this.retryInterval = 0;
        this.endless = !!endless;
        this.processor = processor;

        if (tasksData){
            this.add(tasksData);
        }
    }
    add(tasksData){
        if (!Array.isArray(tasksData)){
            tasksData = [ tasksData ];
        }
        this.total += tasksData.length;
        this.pendding += tasksData.length;
        this._tasksData = this._tasksData.concat(tasksData);
    }
    start(onProgress){
        if (this._deferred){
            console.warn('tasks pool has already been started, reset it before start it again.');
        } else {

            this._deferred = MPromise.deferred();
            this.onProgress = onProgress;
            this._start();
            return this._deferred.promise;
        }
    }
    _start() { //一次并发concurrency个
        while (this._currentConcurrency < this.concurrency && this._tasksData.length){
            this._currentConcurrency++;
            console.log('start#######')
            this._process(this._tasksData.shift(), this._index++);
        }
    }
    _process(taskData, index){
        let _this = this;
        MPromise.retry(function processor(){
            return _this.processor(taskData, index);
        }, function onFail(reason, retries){
            if (retries){
                _this._notifyProgress(index, false, reason, retries)
            } else {
                _this.rejected++;
                _this.pendding--;
                _this._notifyProgress(index, false, reason, retries);
                _this._next();
            }
        }, {
            limit: this.retries,
            interval: this.retryInterval,
            maxInterval: this.maxRetryInterval,
            intervalMultiplier: this.retryIntervalMultiplier
        }).then(function(value) {
            _this.fulfilled++;
            _this.pendding--;
            _this._notifyProgress(index, value, false, null);
            _this._next();
        });
    }
    _next(){
        this._currentConcurrency--;

        if (this._pauseDeferred) {//暂停
            if (this._currentConcurrency == 0){
                this._pauseDeferred.promise.resolve(null);//暂停，处理完了
            }
        } else {
            this._start();
        }
    }
    _notifyProgress(index, success, errror, retries){
        if(typeof this.onProgress == 'function'){
            let progress = {
                index: index,
                success: success,
                error: errror,
                retries: retries,
                fulfilled: this.fulfilled,
                rejected: this.rejected,
                pending: this.pending,
                total: this.total,
            };
            try {
                this.onProgress(progress);
            } catch (e) {
                //todo
            }
        }
    }
    pause(){
        if (this._pauseDeferred){
            if (!this._pauseDeferred.promise.isPending()){
                console.warn('tasks have already been paused.');//任务已经暂停
            } else {
                console.warn('tasks are already been pausing.');//任务暂停中。。。
            }
        } else {
            this._pauseDeferred = MPromise.deferred();
            if(!this._currentConcurrency){  //当前没有要处理的并发值
                this._pauseDeferred.resolve(null);
            }
        }

        return this._pauseDeferred.promise;
    }
    resume(){ //可能暂停中，可能完全暂停了
        if(!this._pauseDeferred){
            console.warn('tasks are not paused.');
            return;
        }
        this._pauseDeferred = null;
        this._start();
    }
    reset(){
        this.pause().then(()=>{//
            this.rejected = 0;
            this.fulfilled = 0;
            this.pending = 0;
            this.total = 0;
            this._index = 0;

            this._tasksData = [];
            this._deferred = null;
            this._pauseDeferred = null;
            this.onProgress = null;
            //this._progressError = null;
        })
    }
}