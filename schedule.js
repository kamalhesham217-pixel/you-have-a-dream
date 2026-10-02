const storageKey = "study-system-2027.weekly-schedule";

const days = [
	{ id: "saturday", label: "السبت" },
	{ id: "sunday", label: "الأحد" },
	{ id: "monday", label: "الإثنين" },
	{ id: "tuesday", label: "الثلاثاء" },
	{ id: "wednesday", label: "الأربعاء" },
	{ id: "thursday", label: "الخميس" },
	{ id: "friday", label: "الجمعة" },
];

const subjects = SUBJECTS.map(({ id, title, unitCount }) => ({ id, label: title, unitCount }));
const sessionOutcomes = [
	{ value: "completed", label: "مكتملة", option: "Completed" },
	{ value: "partial", label: "مكتملة جزئيًا", option: "Partially completed" },
	{ value: "not-completed", label: "غير مكتملة", option: "Not completed" },
];

const scheduleGrid = document.querySelector("#schedule-grid");
const todaySessions = document.querySelector("#today-sessions");
const emptyDay = () => Array.from({ length: 2 }, () => ({ subject: "", studied: false, unit: null, outcome: null }));

function normalizeSchedule(savedSchedule) {
	return Object.fromEntries(
		days.map(({ id }) => {
			const savedSlots = Array.isArray(savedSchedule?.[id]) ? savedSchedule[id] : [];
			const slots = Array.from({ length: 2 }, (_, index) => {
				const savedSlot = savedSlots[index];
				const subject = subjects.some(({ id: subjectId }) => subjectId === savedSlot?.subject)
					? savedSlot.subject
					: "";

				return {
					subject,
					studied: Boolean(subject && savedSlot?.studied),
					unit: Number.isInteger(savedSlot?.unit)
						&& savedSlot.unit >= 0
						&& savedSlot.unit < (subjects.find(({ id }) => id === subject)?.unitCount ?? 0)
						? savedSlot.unit
						: null,
					outcome: subject && savedSlot?.studied && sessionOutcomes.some(({ value }) => value === savedSlot?.outcome)
						? savedSlot.outcome
						: null,
				};
			});

			return [id, slots];
		}),
	);
}

function loadSchedule() {
	try {
		const savedSchedule = localStorage.getItem(storageKey);
		return savedSchedule ? normalizeSchedule(JSON.parse(savedSchedule)) : normalizeSchedule({});
	} catch {
		return normalizeSchedule({});
	}
}

function saveSchedule() {
	localStorage.setItem(storageKey, JSON.stringify(schedule));
	syncCurrentWeeklyAssignments(schedule);
}

function formatScheduleNumber(value) {
	return new Intl.NumberFormat("ar-EG", { useGrouping: false }).format(value);
}

function getScheduleSummary() {
	const assignedSlots = Object.values(schedule).flat().filter((slot) => slot.subject);
	const completedSessions = assignedSlots.filter((slot) => slot.studied).length;

	return {
		assignedSessions: assignedSlots.length,
		completedSessions,
		percentage: assignedSlots.length ? Math.round((completedSessions / assignedSlots.length) * 100) : 0,
		subjects: subjects.map((subject) => {
			const subjectSlots = assignedSlots.filter((slot) => slot.subject === subject.id);
			return {
				...subject,
				assigned: subjectSlots.length,
				completed: subjectSlots.filter((slot) => slot.studied).length,
			};
		}),
	};
}

function getOutcomeCounts(slots) {
	const assignedSlots = slots.filter((slot) => slot.subject);
	return {
		completed: assignedSlots.filter((slot) => slot.outcome === "completed").length,
		partial: assignedSlots.filter((slot) => slot.outcome === "partial").length,
		notCompleted: assignedSlots.filter((slot) => slot.outcome === "not-completed").length,
		none: assignedSlots.filter((slot) => !sessionOutcomes.some(({ value }) => value === slot.outcome)).length,
	};
}

function renderOutcomeCounts(slots, prefix) {
	const counts = getOutcomeCounts(slots);
	document.querySelector(`#${prefix}-outcome-completed`).textContent = formatScheduleNumber(counts.completed);
	document.querySelector(`#${prefix}-outcome-partial`).textContent = formatScheduleNumber(counts.partial);
	document.querySelector(`#${prefix}-outcome-not-completed`).textContent = formatScheduleNumber(counts.notCompleted);
	document.querySelector(`#${prefix}-outcome-none`).textContent = formatScheduleNumber(counts.none);
}

function createSubjectSummary(subjectSummary) {
	const card = document.createElement("article");
	card.className = "subject-weekly-item";

	const title = document.createElement("h3");
	title.textContent = subjectSummary.label;

	const stats = document.createElement("div");
	stats.className = "subject-weekly-stats";
	for (const [label, value] of [["المسندة", subjectSummary.assigned], ["المكتملة", subjectSummary.completed]]) {
		const stat = document.createElement("div");
		stat.className = "subject-weekly-stat";
		const statLabel = document.createElement("span");
		statLabel.className = "subject-weekly-stat-label";
		statLabel.textContent = label;
		const statValue = document.createElement("strong");
		statValue.className = "subject-weekly-stat-value";
		statValue.textContent = formatScheduleNumber(value);
		stat.append(statLabel, statValue);
		stats.append(stat);
	}

	card.append(title, stats);
	return card;
}

function createTodayUnitSelector(day, slotIndex, slot) {
	const subject = subjects.find(({ id }) => id === slot.subject);
	if (!subject) {
		return null;
	}

	const field = document.createElement("div");
	field.className = "today-unit-planning";
	const label = document.createElement("label");
	label.className = "today-unit-label";
	label.textContent = "الوحدة";
	label.htmlFor = `today-unit-${day.id}-${slotIndex}`;

	const select = document.createElement("select");
	select.className = "today-unit-select";
	select.id = label.htmlFor;
	select.dataset.day = day.id;
	select.dataset.slot = String(slotIndex);
	select.setAttribute("aria-label", `الوحدة المخططة لـ${subject.label}، ${slotIndex === 0 ? "الحصة الأولى" : "الحصة الثانية"}`);

	const noUnit = document.createElement("option");
	noUnit.value = "";
	noUnit.textContent = "لا توجد وحدة مختارة";
	select.append(noUnit);
	for (let unitIndex = 0; unitIndex < subject.unitCount; unitIndex += 1) {
		const option = document.createElement("option");
		option.value = String(unitIndex);
		option.textContent = `الوحدة ${formatScheduleNumber(unitIndex + 1)}`;
		select.append(option);
	}
	select.value = slot.unit === null ? "" : String(slot.unit);
	field.append(label, select);
	return field;
}

function renderScheduleSummary() {
	const summary = getScheduleSummary();
	document.querySelector("#weekly-completed-count").textContent = formatScheduleNumber(summary.completedSessions);
	document.querySelector("#weekly-assigned-count").textContent = formatScheduleNumber(summary.assignedSessions);
	document.querySelector("#weekly-completion-percent").textContent = `${formatScheduleNumber(summary.percentage)}٪`;
	const track = document.querySelector(".weekly-progress-track");
	track.setAttribute("aria-valuenow", String(summary.percentage));
	track.setAttribute("aria-valuetext", `${summary.percentage}%`);
	track.querySelector(".weekly-progress-fill").style.width = `${summary.percentage}%`;
	document.querySelector("#subject-breakdown").replaceChildren(...summary.subjects.map(createSubjectSummary));
	renderOutcomeCounts(Object.values(schedule).flat(), "weekly");
}

function getTodayScheduleDay(date = new Date()) {
	return days[(date.getDay() + 1) % 7];
}

function getOutcomeLabel(outcome) {
	return sessionOutcomes.find(({ value }) => value === outcome)?.label ?? "بلا نتيجة";
}

function createTodayOutcomeSelect(day, slotIndex, slot) {
	const field = document.createElement("div");
	field.className = "today-outcome-field";

	const label = document.createElement("label");
	label.className = "today-outcome-label";
	label.textContent = "نتيجة الجلسة";
	label.htmlFor = `today-outcome-${day.id}-${slotIndex}`;

	const select = document.createElement("select");
	select.className = "today-outcome-select";
	select.id = label.htmlFor;
	select.dataset.day = day.id;
	select.dataset.slot = String(slotIndex);
	select.setAttribute("aria-label", `Session result، ${slotIndex === 0 ? "الحصة الأولى" : "الحصة الثانية"}`);
	select.disabled = !slot.subject || !slot.studied;

	const noOutcome = document.createElement("option");
	noOutcome.value = "";
	noOutcome.textContent = "No result";
	select.append(noOutcome);
	for (const outcome of sessionOutcomes) {
		const option = document.createElement("option");
		option.value = outcome.value;
		option.textContent = outcome.option;
		select.append(option);
	}
	select.value = slot.outcome ?? "";
	field.append(label, select);
	return field;
}

function createTodaySession(day, slotIndex, slot, subjectProgress) {
	const card = document.createElement("article");
	const isAssigned = Boolean(slot.subject);
	card.className = `today-session ${isAssigned ? (slot.studied ? "is-studied" : "is-assigned") : "is-empty"}`;

	const heading = document.createElement("div");
	heading.className = "today-session-heading";
	const title = document.createElement("h3");
	title.textContent = isAssigned
		? subjects.find(({ id }) => id === slot.subject)?.label ?? "مادة غير معروفة"
		: "جلسة فارغة";
	const sessionName = document.createElement("span");
	sessionName.className = "today-session-number";
	sessionName.textContent = slotIndex === 0 ? "الحصة الأولى" : "الحصة الثانية";
	heading.append(title, sessionName);
	card.append(heading);

	if (!isAssigned) {
		const message = document.createElement("p");
		message.className = "today-session-empty-message";
		message.textContent = "لا توجد مادة محددة، ولا يوجد إجراء مطلوب.";
		card.append(message);
		return card;
	}

	const subjectSummary = getSubjectSummary(slot.subject, subjectProgress, schedule);
	card.append(createTodayUnitSelector(day, slotIndex, slot));
	const state = document.createElement("p");
	state.className = `today-session-state${slot.studied ? " is-complete" : ""}`;
	state.textContent = slot.studied ? "مكتملة" : "غير مكتملة";
	const outcomeBadge = document.createElement("span");
	outcomeBadge.className = `today-outcome-badge${slot.outcome ? ` is-${slot.outcome}` : " is-none"}`;
	outcomeBadge.textContent = getOutcomeLabel(slot.outcome);

	const progress = document.createElement("div");
	progress.className = "today-subject-progress";
	for (const [label, completed, total] of [
		["الوحدات", subjectSummary.completedUnits, subjectSummary.totalUnits],
		["الامتحانات", subjectSummary.completedExams, subjectSummary.totalExams],
	]) {
		const metric = document.createElement("div");
		metric.className = "today-subject-metric";
		const metricLabel = document.createElement("span");
		metricLabel.textContent = label;
		const metricValue = document.createElement("strong");
		metricValue.textContent = `${formatScheduleNumber(completed)} / ${formatScheduleNumber(total)}`;
		metric.append(metricLabel, metricValue);
		progress.append(metric);
	}

	const button = document.createElement("button");
	button.type = "button";
	button.className = `session-status${slot.studied ? " is-studied" : ""}`;
	button.dataset.day = day.id;
	button.dataset.slot = String(slotIndex);
	button.setAttribute("aria-pressed", String(slot.studied));
	button.setAttribute("aria-label", `${slot.studied ? "إلغاء إكمال" : "تحديد إكمال"} جلسة ${title.textContent}، ${sessionName.textContent}`);
	button.textContent = slot.studied ? "إلغاء إكمال الجلسة" : "تحديد الجلسة مكتملة";

	card.append(state, progress, button, outcomeBadge, createTodayOutcomeSelect(day, slotIndex, slot));
	return card;
}

function renderTodayStudy(date = new Date()) {
	const day = getTodayScheduleDay(date);
	const slots = schedule[day.id] ?? emptyDay();
	const assigned = slots.filter((slot) => Boolean(slot.subject));
	const completed = assigned.filter((slot) => slot.studied).length;
	const percentage = assigned.length ? Math.round((completed / assigned.length) * 100) : 0;
	const subjectProgress = loadSubjectProgress();
	const dateLabel = new Intl.DateTimeFormat("ar-EG", {
		year: "numeric",
		month: "long",
		day: "numeric",
	}).format(date);

	document.querySelector("#today-study-date").textContent = `${day.label}، ${dateLabel}`;
	document.querySelector("#today-assigned-count").textContent = formatScheduleNumber(assigned.length);
	document.querySelector("#today-completed-count").textContent = formatScheduleNumber(completed);
	document.querySelector("#today-completion-percent").textContent = `${formatScheduleNumber(percentage)}٪`;
	renderOutcomeCounts(slots, "today");
	todaySessions.replaceChildren(...slots.map((slot, index) => createTodaySession(day, index, slot, subjectProgress)));
}

function updateScheduleSlotState(section, day, slotIndex, slot) {
	const isAssigned = Boolean(slot.subject);
	const isStudied = isAssigned && slot.studied;
	const button = section.querySelector(".session-status");
	const subjectLabel = subjects.find(({ id }) => id === slot.subject)?.label ?? "لا توجد مادة محددة";

	section.classList.toggle("is-empty", !isAssigned);
	section.classList.toggle("is-assigned", isAssigned && !isStudied);
	section.classList.toggle("is-studied", isStudied);
	button.disabled = !isAssigned;
	button.setAttribute("aria-pressed", String(isStudied));
	button.setAttribute("aria-label", `${isStudied ? "تمت المذاكرة" : "لم تتم المذاكرة"}، ${subjectLabel}، ${day.label}، ${slotIndex === 0 ? "الحصة الأولى" : "الحصة الثانية"}`);
	button.textContent = isStudied ? "تمت المذاكرة" : "لم تتم المذاكرة";

	let unitLabel = section.querySelector(".slot-unit-label");
	if (isAssigned && Number.isInteger(slot.unit)) {
		if (!unitLabel) {
			unitLabel = document.createElement("span");
			unitLabel.className = "slot-unit-label";
			section.insertBefore(unitLabel, button);
		}
		unitLabel.textContent = `الوحدة ${formatScheduleNumber(slot.unit + 1)}`;
	} else {
		unitLabel?.remove();
	}

	let outcomeLabel = section.querySelector(".slot-outcome-label");
	if (isAssigned && slot.outcome) {
		if (!outcomeLabel) {
			outcomeLabel = document.createElement("span");
			outcomeLabel.className = "slot-outcome-label";
			section.insertBefore(outcomeLabel, button);
		}
		outcomeLabel.textContent = `النتيجة: ${getOutcomeLabel(slot.outcome)}`;
	} else {
		outcomeLabel?.remove();
	}
}

function createSubjectSelect(dayId, slotIndex, slot) {
	const select = document.createElement("select");
	select.className = "session-subject";
	select.dataset.day = dayId;
	select.dataset.slot = String(slotIndex);
	select.setAttribute("aria-label", `اختر مادة ${slotIndex === 0 ? "الحصة الأولى" : "الحصة الثانية"}`);

	const placeholder = document.createElement("option");
	placeholder.value = "";
	placeholder.textContent = "اختر المادة";
	select.append(placeholder);

	for (const subject of subjects) {
		const option = document.createElement("option");
		option.value = subject.id;
		option.textContent = subject.label;
		select.append(option);
	}

	select.value = slot.subject;
	return select;
}

function createStatusButton(day, slotIndex, slot) {
	const button = document.createElement("button");
	button.type = "button";
	button.className = "session-status";
	button.dataset.day = day.id;
	button.dataset.slot = String(slotIndex);
	button.disabled = !slot.subject;
	return button;
}

function createSlot(day, slotIndex, slot) {
	const section = document.createElement("section");
	section.className = "schedule-slot";
	section.dataset.day = day.id;
	section.dataset.slot = String(slotIndex);

	const heading = document.createElement("div");
	heading.className = "slot-heading";

	const label = document.createElement("label");
	label.className = "slot-label";
	label.textContent = slotIndex === 0 ? "الحصة الأولى" : "الحصة الثانية";

	const number = document.createElement("span");
	number.className = "slot-number";
	number.textContent = slotIndex === 0 ? "١ / ٢" : "٢ / ٢";

	const select = createSubjectSelect(day.id, slotIndex, slot);
	label.htmlFor = `subject-${day.id}-${slotIndex}`;
	select.id = label.htmlFor;

	heading.append(label, number);
	section.append(heading, select, createStatusButton(day, slotIndex, slot));
	updateScheduleSlotState(section, day, slotIndex, slot);
	return section;
}

function renderSchedule() {
	const fragment = document.createDocumentFragment();

	days.forEach((day, dayIndex) => {
		const card = document.createElement("article");
		card.className = "schedule-day";
		card.setAttribute("aria-labelledby", `day-${day.id}`);

		const header = document.createElement("header");
		header.className = "schedule-day-header";

		const title = document.createElement("h2");
		title.id = `day-${day.id}`;
		title.textContent = day.label;

		const index = document.createElement("span");
		index.className = "day-index";
		index.textContent = `${new Intl.NumberFormat("ar-EG", { useGrouping: false }).format(dayIndex + 1)} / ٧`;

		const slots = document.createElement("div");
		slots.className = "schedule-day-slots";
		schedule[day.id].forEach((slot, slotIndex) => slots.append(createSlot(day, slotIndex, slot)));

		header.append(title, index);
		card.append(header, slots);
		fragment.append(card);
	});

	scheduleGrid.replaceChildren(fragment);
	renderScheduleSummary();
}

const schedule = loadSchedule();
syncCurrentWeeklyAssignments(schedule);
renderSchedule();
renderTodayStudy();

scheduleGrid.addEventListener("change", (event) => {
	const select = event.target.closest(".session-subject");
	if (!select) {
		return;
	}

	const { day, slot } = select.dataset;
	const slotIndex = Number(slot);
	const session = schedule[day][slotIndex];
	const wasStudied = session.studied;
	const previousSubject = session.subject;
	session.subject = select.value;
	if (session.subject !== previousSubject) {
		session.unit = null;
		session.outcome = null;
	}
	if (!session.subject) {
		session.studied = false;
		session.unit = null;
		session.outcome = null;
	}
	updateScheduleSlotState(
		scheduleGrid.querySelector(`.schedule-slot[data-day="${day}"][data-slot="${slotIndex}"]`),
		days.find((dayItem) => dayItem.id === day),
		slotIndex,
		session,
	);
	saveSchedule();
	renderTodayStudy();
	recordWeeklyCompletion("sessions", `${day}:${slotIndex}`, wasStudied, session.studied, {
		subjectId: session.subject,
		slotId: `${day}:${slotIndex}`,
	});
	renderScheduleSummary();
});

todaySessions.addEventListener("change", (event) => {
	const outcomeSelect = event.target.closest(".today-outcome-select");
	if (outcomeSelect) {
		const { day, slot } = outcomeSelect.dataset;
		const slotIndex = Number(slot);
		const session = schedule[day]?.[slotIndex];
		const selectedOutcome = outcomeSelect.value;
		session.outcome = session.subject && session.studied
			&& sessionOutcomes.some(({ value }) => value === selectedOutcome)
			? selectedOutcome
			: null;
		updateScheduleSlotState(
			scheduleGrid.querySelector(`.schedule-slot[data-day="${day}"][data-slot="${slotIndex}"]`),
			days.find((dayItem) => dayItem.id === day),
			slotIndex,
			session,
		);
		saveSchedule();
		renderTodayStudy();
		renderScheduleSummary();
		return;
	}

	const select = event.target.closest(".today-unit-select");
	if (!select) {
		return;
	}

	const { day, slot } = select.dataset;
	const slotIndex = Number(slot);
	const session = schedule[day]?.[slotIndex];
	const subject = subjects.find(({ id }) => id === session?.subject);
	const selectedUnit = select.value === "" ? null : Number(select.value);
	session.unit = Number.isInteger(selectedUnit) && selectedUnit >= 0 && selectedUnit < (subject?.unitCount ?? 0)
		? selectedUnit
		: null;

	updateScheduleSlotState(
		scheduleGrid.querySelector(`.schedule-slot[data-day="${day}"][data-slot="${slotIndex}"]`),
		days.find((dayItem) => dayItem.id === day),
		slotIndex,
		session,
	);
	saveSchedule();
	renderTodayStudy();
});

function handleSessionStatusClick(event) {
	const button = event.target.closest(".session-status");
	if (!button || button.disabled) {
		return;
	}

	const { day, slot } = button.dataset;
	const slotIndex = Number(slot);
	const session = schedule[day][slotIndex];
	if (!session.subject) {
		return;
	}

	const wasStudied = session.studied;
	session.studied = !session.studied;
	if (!session.studied) {
		session.outcome = null;
	}
	updateScheduleSlotState(
		scheduleGrid.querySelector(`.schedule-slot[data-day="${day}"][data-slot="${slotIndex}"]`),
		days.find((dayItem) => dayItem.id === day),
		slotIndex,
		session,
	);
	saveSchedule();
	recordWeeklyCompletion("sessions", `${day}:${slotIndex}`, wasStudied, session.studied, {
		subjectId: session.subject,
		slotId: `${day}:${slotIndex}`,
	});
	renderTodayStudy();
	renderScheduleSummary();
}

scheduleGrid.addEventListener("click", handleSessionStatusClick);
todaySessions.addEventListener("click", handleSessionStatusClick);
