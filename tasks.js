// ==================== TASK MANAGEMENT ====================

function addTask() {
    const input = document.getElementById('newTaskInput');
    const priority = document.getElementById('prioritySelect').value;

    if (input.value.trim() === '') {
        showModal('Please enter a task name!', 'Oops! 😅', '⚠️');
        return;
    }

    appData.tasks.push({
        text: input.value.trim(),
        priority: priority,
        isDone: false,
        doneTimestamp: null
    });

    input.value = '';
    saveData();
    renderTasks();
    updateStats();
}

function deleteTask(index) {
    if (!appData.tasks[index]) return;

    const task = appData.tasks[index];
    
    if (task.isDone) {
        // Penalty for deleting completed task
        const penalty = PRIORITY_PENALTIES[task.priority] || 0;
        appData.totalPoints = Math.max(0, appData.totalPoints - penalty);
        
        showModal(
            `Task deleted.

You lost ${penalty} points as penalty for removing a completed task!`,
            '⚠️ Penalty Applied',
            '⚠️'
        );
    } else {
        showModal('Task deleted successfully!', '✅ Deleted', '🗑️');
    }

    appData.tasks.splice(index, 1);
    saveData();
    renderTasks();
    updateStats();
}

function renderTasks() {
    const container = document.getElementById('taskList');
    const filterValue = document.getElementById('filterSelect').value;

    // Filter tasks based on selected filter
    let filtered = appData.tasks;
    if (filterValue === 'active') filtered = appData.tasks.filter(t => !t.isDone);
    if (filterValue === 'done') filtered = appData.tasks.filter(t => t.isDone);

    container.innerHTML = filtered.length === 0 
        ? '<p style="text-align:center;color:#888;padding:20px">📝 No tasks yet. Add one!</p>' 
        : '';

    filtered.forEach((task) => {
        // ✅ FIX: Find the REAL index in the full array, not the filtered array
        const realIdx = appData.tasks.indexOf(task);

        const taskDiv = document.createElement('div');
        taskDiv.className = `task-item ${task.isDone ? 'done' : ''} priority-${task.priority}`;

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = task.isDone;
        checkbox.onchange = () => toggleTask(realIdx); // ✅ Use realIdx, not idx

        const label = document.createElement('label');
        label.textContent = task.text;

        const pointsBadge = document.createElement('span');
        pointsBadge.className = 'task-points';
        pointsBadge.textContent = `+${PRIORITY_POINTS[task.priority]}`;

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '🗑️';
        deleteBtn.className = 'delete-btn';
        deleteBtn.onclick = () => deleteTask(realIdx); // ✅ Use realIdx, not idx

        taskDiv.appendChild(checkbox);
        taskDiv.appendChild(label);
        taskDiv.appendChild(pointsBadge);
        taskDiv.appendChild(deleteBtn);

        container.appendChild(taskDiv);
    });
}

function toggleTask(index) {
    // Check if task exists
    if (!appData.tasks[index]) return;

    // 1. DIRECTLY update the array
    appData.tasks[index].isDone = !appData.tasks[index].isDone;

    // Convenience variable for reading properties
    const task = appData.tasks[index];

    if (task.isDone) {
        // 2. Add Timestamp directly to array
        if (!task.doneTimestamp) {
            appData.tasks[index].doneTimestamp = Date.now();
        }

        // 3. Add Points directly to main state
        const pointsEarned = PRIORITY_POINTS[task.priority] || 0;
        appData.totalPoints = (appData.totalPoints || 0) + pointsEarned;

        // 4. Safe Logic Block
        try {
            appData.lifetimeTasksCompleted++;
            updateStreak();
            showModal(
                `Task completed!

+${pointsEarned} points earned!

Keep going!`,
                '🎉 Well Done!',
                '🎉'
            );
            checkAchievements();
        } catch (error) {
            console.error("Error in completion logic:", error);
        }
    } else {
        // Unchecking removes points
        const pointsLost = PRIORITY_POINTS[task.priority] || 0;
        appData.totalPoints = Math.max(0, appData.totalPoints - pointsLost);
        appData.tasks[index].doneTimestamp = null;

        showModal(
            `Task unchecked.

-${pointsLost} points lost!`,
            '❌ Task Unchecked',
            '❌'
        );
    }

    // 5. Save AFTER all mutations
    saveData();
    renderTasks();
    updateStats();
}