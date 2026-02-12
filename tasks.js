/ ============================================================
// TASKS MODULE
// ============================================================
// Handles task CRUD operations and rendering
let currentCategory = 1;
/**
	Add a new task
*/
function addTask() {
const input = document.getElementById('taskInput');
const prioritySelect = document.getElementById('prioritySelect');
if (!input || !prioritySelect) return;
const text = input.value.trim();
const priority = prioritySelect.value;
if (!text) {
showModal("Please enter a task!", "EMPTY TASK ⚠️", "❌");
return;
}
const task = {
text: text,
priority: priority,
category: currentCategory,
isDone: false,
doneTimestamp: null,
createdAt: Date.now()
};
State.addTask(task);
saveData();
renderTasks();
// Clear input
input.value = '';
prioritySelect.value = 'medium';
input.focus();
}
/**
	Toggle task completion
	@param {number} index - Task index in full array
*/
function toggleTask(index) {
const data = State.getData();
const task = data.tasks[index];
if (!task) return;
const newIsDone = !task.isDone;
State.updateTask(index, { isDone: newIsDone });
if (newIsDone) {
// Task completed
State.updateTask(index, { doneTimestamp: Date.now() });
 const pointsEarned = PRIORITY_POINTS[task.priority] || 0;
 State.addPoints(pointsEarned);
 State.incrementLifetimeTasksCompleted();
 
 updateStreak();
 
 showModal(
     `Task completed!<br><br><strong>+${pointsEarned} points</strong> earned! 🎉`,
     "TASK COMPLETE! ✅",
     "🏆"
 );
 
 // Play sound
 try {
     const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3');
     audio.play().catch(e => console.log('Audio play failed:', e));
 } catch (e) {
     console.log('Audio error:', e);
 }
 
 checkAchievements();

} else {
// Task unchecked
State.updateTask(index, { doneTimestamp: null });
 const pointsLost = PRIORITY_POINTS[task.priority] || 0;
 State.removePoints(pointsLost);

}
saveData();
renderUI();
renderTasks();
checkRankUp();
}
/**
	Delete a task
	@param {number} index - Task index
*/
async function deleteTask(index) {
const confirmed = await confirmDelete(
"Are you sure you want to delete this task? This action cannot be undone."
);
if (confirmed) {
State.deleteTask(index);
saveData();
renderTasks();
showModal("Task deleted successfully.", "TASK DELETED 🗑️", "✅");
}
}
/**
	Switch category
	@param {number} category - Category number (1-4)
*/
function switchCategory(category) {
currentCategory = category;
// Update button styles
document.querySelectorAll('.category-btn').forEach(btn => {
btn.classList.remove('active');
if (parseInt(btn.dataset.category) === category) {
btn.classList.add('active');
}
});
renderTasks();
}
/**
	Render tasks for current category
*/
function renderTasks() {
const container = document.getElementById('tasksContainer');
if (!container) return;
const data = State.getData();
const filtered = data.tasks.filter(t => t.category === currentCategory);
container.innerHTML = '';
if (filtered.length === 0) {
container.innerHTML = '
No tasks yet. Add one! 📝
';
return;
}
filtered.forEach(task => {
// Find real index in full array
const realIdx = data.tasks.indexOf(task);
 const taskDiv = document.createElement('div');
 taskDiv.className = `task-item ${task.isDone ? 'done' : ''} priority-${task.priority}`;
 
 const checkbox = document.createElement('input');
 checkbox.type = 'checkbox';
 checkbox.checked = task.isDone;
 checkbox.onchange = () => toggleTask(realIdx);
 
 const label = document.createElement('label');
 label.textContent = task.text;
 
 const pointsBadge = document.createElement('span');
 pointsBadge.className = 'task-points';
 pointsBadge.textContent = `+${PRIORITY_POINTS[task.priority]}`;
 
 const deleteBtn = document.createElement('button');
 deleteBtn.textContent = '🗑️';
 deleteBtn.className = 'delete-btn';
 deleteBtn.onclick = () => deleteTask(realIdx);
 
 taskDiv.appendChild(checkbox);
 taskDiv.appendChild(label);
 taskDiv.appendChild(pointsBadge);
 taskDiv.appendChild(deleteBtn);
 
 container.appendChild(taskDiv);

});
}