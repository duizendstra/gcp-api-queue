function gcpApiQueue(specs) {
    "use strict";
    let queue = [];
    let queueIsRunning = false;
    let numActive = 0;
    let maxActive = 5;
    let startNextTask;
    let startTask;
    let addTask;
    let startQueue;
    let queuePromise;
    let queuePromiseResolve;

    startTask = function (task) {
        numActive += 1;
        task.status = "active";
        task.promise().then(function () {
            numActive -= 1;
            if (numActive === 0) {
                return queuePromiseResolve();
            }
            startNextTask();
        });
    };

    addTask = function (promise) {
        let task = {
            position: queue.length,
            status: "new",
            promise: promise
        };

        queue.push(task);

        if (queueIsRunning && numActive < maxActive) {
            startTask(task);
        }
    };

    startNextTask = function () {
        let firstInactiveTaskIndex;
        queue.some(function (task, index) {
            if (task.status === "new") {
                firstInactiveTaskIndex = index;
                return true;
            }
        });

        if (firstInactiveTaskIndex === undefined) {
            return;
        }
        let task = queue[firstInactiveTaskIndex];
        startTask(task);
    };

    startQueue = function () {
        queueIsRunning = true;
        while (numActive <= maxActive) {
            startNextTask();
        }
        return queuePromise;
    };

    maxActive = specs.concurrency || 5;

    queuePromise = new Promise(function (resolve) {
        queuePromiseResolve = resolve;
    });

    return {
        addTask: addTask,
        startQueue: startQueue
    };
}

module.exports = gcpApiQueue;