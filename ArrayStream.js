(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like environments that support module.exports,
        // like Node.
        module.exports = factory();
    } else {
        // Browser globals (root is window)
        root.ArrayStream = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
    
    var status = ['pending', 'processing', 'done', 'error', 'abort'],
        defaultOption = {
            interval: 0
        },
        safeObserver = {
            onData: noop,
            onError: noop,
            onComplete: noop
        };
        
    function ArrayStream(arr, options) {
        this.arr = arr;
        this.length = arr.length;
        this._observer = safeObserver;
        this.status = status[0];

        this._timer = null;
        this._interval = options.interval || defaultOption.interval;
    }

    ArrayStream.prototype._scheduleIteration = function _scheduleIteration(arr, iterator) {
        var self = this,
            interval = self._interval;
            
        function _asyncIterate(arr, i, max, iterator) {
            // abort if abort() was called or last iteration
            if (self.status === status[4] || i === max) {
                clearInterval(self._timer);
                return;
            }

            self._timer = setTimeout(function() {
                iterator(arr[i], i, arr);
                _asyncIterate(arr, i + 1, max, iterator);
            }, interval);
        }
        _asyncIterate(arr, 0, arr.length, iterator);
    };

    ArrayStream.prototype.abort = function abort() {
        this.setStatus(4);
        clearTimeout(this._timer);
        this._observer.onComplete(this.status);
    };

    ArrayStream.prototype.setStatus = function setStatus(code) {
        this.status = status[code];
    };
    
    ArrayStream.prototype.subscribe = function subscribe(observer) {
        var self = this,
            lastIdx = self.length - 1;

        observer = Object.assign(self._observer, observer);

        self.setStatus(1);

        this._scheduleIteration(this.arr, function(el, i, arr) {
            try {
                observer.onData(el, i, arr);
            } catch(e) {
                self.setStatus(3);
                observer.onError(e);
            }
            if (i === lastIdx) {
                if (self.status !== status[3]) {
                    self.setStatus(2);
                }
                observer.onComplete(self.status);
            }
        });

    }

    return ArrayStream;

    function noop(){};
}));

