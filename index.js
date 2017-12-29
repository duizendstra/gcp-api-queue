function gcpApiQueue(specs) {
    "use strict";
    // the functions
    let startTask;
    let startNextTask;
    let addTask;
    let startQueue;

    // the array that holds the queue
    let queue = [];

    // flag to see if the queue is running
    let queueIsRunning = false;

    // active tasks
    let numActive = 0;

    // maximum active tasks
    let maxActive = specs.concurrency || 5;

    // the placeholder for the resolve of the queue finish promise
    let queuePromiseResolve;

    // the function to execute on a reject
    let onReject = specs.onReject;

    // the function to execute on a reject
    let onResolve = specs.onResolve;

    // start a task
    startTask = function (task) {
        // increase the active tasks
        numActive += 1;

        // update the task status
        task.status = "active";

        // handle the task promise
        task.promise().then(function (reponse) {
            // update the sask status
            task.status = "finished";

            // clear the task promise
            task.promise = undefined;

            // decrease the active tasks
            numActive -= 1;

            // if the queue is empty return the main promise
            if (numActive === 0) {
                return queuePromiseResolve();
            }

            // execute the reject function if provided
            if (typeof specs.onResolve === "function") {
                onResolve(reponse);
            }

            // start the next available task
            return startNextTask();
        }).catch(function (err) {
            // update the sask status
            task.status = "finished";

            // clear the task promise
            task.promise = undefined;

            // decrease the active tasks
            numActive -= 1;

            // if the queue is empty return the main promise
            if (numActive === 0) {
                return queuePromiseResolve();
            }

            // execute the reject function if provided
            if (typeof specs.onReject === "function") {
                onReject(err);
            }
            return startNextTask();
        });
    };

    // start the first available task
    startNextTask = function () {
        // find the first available task
        let firstInactiveTaskIndex;
        queue.some(function (task, index) {
            if (task.status === "new") {
                firstInactiveTaskIndex = index;
                return true;
            }
        });

        // return if there are no tasks left
        if (firstInactiveTaskIndex === undefined) {
            return false;
        }

        // start the task
        return startTask(queue[firstInactiveTaskIndex]);
    };

    // add a task to the queue
    addTask = function (promise) {
        // build the task object
        let task = {
            position: queue.length,
            status: "new",
            promise: promise
        };

        // add the task to the queue
        queue.push(task);

        // start the task if the maximum concurrent tasks have not been reached
        if (queueIsRunning && numActive < maxActive) {
            startTask(task);
        }
    };

    // start the queue
    startQueue = function () {
        // set the flag for the active queue
        queueIsRunning = true;

        // activate the maximum amount of tasks
        while (numActive < maxActive) {

            // break loop if there are no tasks to start
            if (startNextTask() === false) {
                break;
            }
        }

        // return the main promise
        return new Promise(function (resolve) {
            queuePromiseResolve = resolve;
        });
    };

    return {
        addTask: addTask,
        startQueue: startQueue
    };
}

module.exports = gcpApiQueue;