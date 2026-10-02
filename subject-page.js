const subjectApp = document.querySelector("#subject-app");
const subject = SUBJECTS.find(({ id }) => id === document.body.dataset.subject);
const allSubjectProgress = loadSubjectProgress();
const currentSubjectProgress = allSubjectProgress[subject.id];

function createElement(tagName, className, text) {
	const element = document.createElement(tagName);
	if (className) {
		element.className = className;
	}
	if (text !== undefined) {
		element.textContent = text;
	}
	return element;
}

function createNavigationLink(href, label) {
	const link = document.createElement("a");
	link.className = "subject-nav-link";
	link.href = href;
	link.textContent = label;
	return link;
}

function createProgressMetric(id, title) {
	const metric = createElement("section", "progress-metric");
	metric.id = id;
	const heading = createElement("h2", "metric-title", title);
	const count = createElement("strong", "metric-count", `٠ / ${subject.unitCount}`);
	const track = createElement("div", "metric-track");
	track.setAttribute("role", "progressbar");
	track.setAttribute("aria-label", title);
	track.setAttribute("aria-valuemin", "0");
	track.setAttribute("aria-valuemax", String(subject.unitCount));
	track.setAttribute("aria-valuenow", "0");
	const fill = createElement("span", "metric-fill");
	track.append(fill);
	metric.append(heading, count, track);
	return metric;
}

function createSubjectHeader() {
	const header = createElement("header", "subject-header");
	const copy = createElement("div", "subject-heading");
	copy.append(
		createElement("p", "eyebrow", "دفعة ٢٠٢٧ / مساحات الدراسة"),
		createElement("h1", "", subject.title),
	);

	const navigation = createElement("nav", "subject-navigation");
	navigation.setAttribute("aria-label", "روابط الصفحة");
	navigation.append(
		createNavigationLink("../index.html", "لوحة الاستعداد"),
		createNavigationLink("schedule.html", "الجدول الأسبوعي"),
	);
	header.append(copy, navigation);
	return header;
}

function createProgressSection() {
	const section = createElement("section", "subject-progress");
	section.setAttribute("aria-label", `التقدم في مادة ${subject.title}`);
	section.append(
		createProgressMetric("unit-progress", "الوحدات المكتملة"),
		createProgressMetric("exam-progress", "الامتحانات المكتملة"),
	);
	return section;
}

function formatExamPerformanceCount(value) {
	return new Intl.NumberFormat("ar-EG", { useGrouping: false }).format(value);
}

function createExamPerformanceSection() {
	const performance = getSubjectExamPerformance(subject.id, allSubjectProgress);
	const section = createElement("section", "exam-performance");
	section.id = "subject-exam-performance";
	section.setAttribute("aria-labelledby", "subject-exam-performance-heading");
	const heading = createElement("h2", "exam-performance-title", "أداء الامتحانات");
	heading.id = "subject-exam-performance-heading";
	section.append(heading);

	const metrics = createElement("div", "exam-performance-metrics");
	const values = [
		["الامتحانات ذات الدرجات", `${formatExamPerformanceCount(performance.examsWithScores)} / ${formatExamPerformanceCount(performance.totalExams)}`],
		["متوسط النتيجة", formatExamPerformancePercentage(performance.averagePercentage)],
		["أعلى نتيجة", formatExamPerformancePercentage(performance.highestPercentage)],
		["أقل نتيجة", formatExamPerformancePercentage(performance.lowestPercentage)],
	];
	for (const [label, value] of values) {
		const metric = createElement("div", "exam-performance-metric");
		metric.append(
			createElement("span", "exam-performance-label", label),
			createElement("strong", "exam-performance-value", value),
		);
		metrics.append(metric);
	}
	section.append(metrics);
	return section;
}

function updateSubjectExamPerformance() {
	const performance = getSubjectExamPerformance(subject.id, allSubjectProgress);
	const values = [
		`${formatExamPerformanceCount(performance.examsWithScores)} / ${formatExamPerformanceCount(performance.totalExams)}`,
		formatExamPerformancePercentage(performance.averagePercentage),
		formatExamPerformancePercentage(performance.highestPercentage),
		formatExamPerformancePercentage(performance.lowestPercentage),
	];
	document.querySelectorAll("#subject-exam-performance .exam-performance-value").forEach((value, index) => {
		value.textContent = values[index];
	});
}

function createWeeklySessionsSection() {
	const section = createElement("section", "weekly-session-summary");
	section.id = "weekly-session-summary";
	section.setAttribute("aria-label", "جلسات المذاكرة الأسبوعية");
	const copy = createElement("h2", "weekly-session-title", "جلسات المذاكرة الأسبوعية");
	const value = createElement("strong", "weekly-session-count", "٠");
	value.id = "weekly-session-count";
	value.setAttribute("aria-live", "polite");
	const label = createElement("span", "weekly-session-label", "جلسات مكتملة");
	const valueContainer = createElement("div", "weekly-session-value");
	valueContainer.append(value, label);
	section.append(copy, valueContainer);
	return section;
}

function createUnitToggle(unitIndex, unit) {
	const button = createElement("button", "unit-toggle");
	button.type = "button";
	button.dataset.unit = String(unitIndex);
	button.setAttribute("aria-pressed", String(unit.studied));
	button.setAttribute("aria-label", `${unit.studied ? "إلغاء إتمام" : "تحديد إتمام"} ${getUnitTitle(unitIndex)}`);
	button.textContent = unit.studied ? "تمت المذاكرة" : "لم تتم المذاكرة";
	button.classList.toggle("is-complete", unit.studied);
	return button;
}

function createScoreInput(unitIndex, field, labelText, value) {
	const label = createElement("label", "score-field");
	const caption = createElement("span", "score-label", labelText);
	const input = document.createElement("input");
	input.type = "number";
	input.step = "any";
	input.inputMode = "decimal";
	input.className = "exam-input";
	input.dataset.unit = String(unitIndex);
	input.dataset.examField = field;
	input.id = `score-${subject.id}-${unitIndex}-${field}`;
	input.value = value ?? "";
	input.setAttribute("aria-label", `${labelText}، ${getUnitTitle(unitIndex)}`);
	label.htmlFor = input.id;
	label.append(caption, input);
	return input;
}

function createExamSection(unitIndex, unit) {
	const section = createElement("section", "unit-exam");
	section.dataset.unit = String(unitIndex);
	section.setAttribute("aria-label", `الامتحان الشامل، ${getUnitTitle(unitIndex)}`);

	const heading = createElement("div", "exam-heading");
	heading.append(createElement("h3", "", "الامتحان الشامل"));
	const status = createElement("span", "exam-status");
	status.dataset.examStatus = "";
	heading.append(status);

	const fields = createElement("div", "exam-fields");
	fields.append(
		createScoreInput(unitIndex, "score", "الدرجة المسجلة", unit.exam.score),
		createScoreInput(unitIndex, "minScore", "أقل درجة", unit.exam.minScore),
		createScoreInput(unitIndex, "maxScore", "أعلى درجة", unit.exam.maxScore),
	);

	const feedback = createElement("p", "exam-feedback");
	feedback.dataset.examFeedback = "";
	feedback.setAttribute("aria-live", "polite");
	section.append(heading, fields, feedback);
	updateExamDisplay(section, unit.exam);
	return section;
}

function createUnitCard(unitIndex, unit) {
	const card = createElement("article", "subject-unit");
	const header = createElement("header", "unit-header");
	const titleGroup = createElement("div", "unit-title-group");
	const ordinal = createElement("span", "unit-ordinal", `${new Intl.NumberFormat("ar-EG", { useGrouping: false }).format(unitIndex + 1)} / ${new Intl.NumberFormat("ar-EG", { useGrouping: false }).format(subject.unitCount)}`);
	titleGroup.append(ordinal, createElement("h2", "", getUnitTitle(unitIndex)));
	header.append(titleGroup, createUnitToggle(unitIndex, unit));
	card.append(header, createExamSection(unitIndex, unit));
	return card;
}

function updateExamDisplay(section, exam) {
	const result = validateExam(exam);
	const status = section.querySelector("[data-exam-status]");
	const feedback = section.querySelector("[data-exam-feedback]");
	const scoreInput = section.querySelector('[data-exam-field="score"]');
	status.textContent = result.complete ? "مكتمل" : "غير مكتمل";
	status.classList.toggle("is-complete", result.complete);
	feedback.textContent = result.message;
	feedback.classList.toggle("is-invalid", !result.complete && exam.score !== null && exam.score !== "");

	const minScore = parseScore(exam.minScore);
	const maxScore = parseScore(exam.maxScore);
	if (minScore !== null && maxScore !== null && maxScore >= minScore) {
		scoreInput.min = String(minScore);
		scoreInput.max = String(maxScore);
	} else {
		scoreInput.removeAttribute("min");
		scoreInput.removeAttribute("max");
	}
}

function renderSubjectPage() {
	document.title = `${subject.title} | الثانوية العامة ٢٠٢٧`;
	const header = createSubjectHeader();
	const progress = createProgressSection();
	const examPerformance = createExamPerformanceSection();
	const sessions = createWeeklySessionsSection();
	const units = createElement("section", "subject-units");
	units.setAttribute("aria-label", `وحدات مادة ${subject.title}`);
	currentSubjectProgress.units.forEach((unit, index) => units.append(createUnitCard(index, unit)));
	subjectApp.append(header, progress, examPerformance, sessions, units);
	updateSubjectProgress(currentSubjectProgress, subject.unitCount);
	updateWeeklySessionCount();
}

function updateWeeklySessionCount() {
	const count = getScheduledStudySessions(subject.id);
	document.querySelector("#weekly-session-count").textContent = new Intl.NumberFormat("ar-EG", { useGrouping: false }).format(count);
}

renderSubjectPage();

subjectApp.addEventListener("click", (event) => {
	const button = event.target.closest(".unit-toggle");
	if (!button) {
		return;
	}

	const unitIndex = Number(button.dataset.unit);
	const unit = currentSubjectProgress.units[unitIndex];
	const wasComplete = unit.studied;
	unit.studied = !unit.studied;
	button.setAttribute("aria-pressed", String(unit.studied));
	button.setAttribute("aria-label", `${unit.studied ? "إلغاء إتمام" : "تحديد إتمام"} ${getUnitTitle(unitIndex)}`);
	button.textContent = unit.studied ? "تمت المذاكرة" : "لم تتم المذاكرة";
	button.classList.toggle("is-complete", unit.studied);
	saveSubjectProgress(allSubjectProgress);
	recordWeeklyCompletion("units", `${subject.id}:${unitIndex}`, wasComplete, unit.studied, {
		subjectId: subject.id,
		unitIndex,
	});
	updateSubjectProgress(currentSubjectProgress, subject.unitCount);
});

subjectApp.addEventListener("input", (event) => {
	const input = event.target.closest(".exam-input");
	if (!input) {
		return;
	}

	const unitIndex = Number(input.dataset.unit);
	const unit = currentSubjectProgress.units[unitIndex];
	const wasComplete = validateExam(unit.exam).complete;
	unit.exam[input.dataset.examField] = parseScore(input.value);
	const section = input.closest(".unit-exam");
	updateExamDisplay(section, unit.exam);
	saveSubjectProgress(allSubjectProgress);
	updateSubjectExamPerformance();
	recordWeeklyCompletion("exams", `${subject.id}:${unitIndex}`, wasComplete, validateExam(unit.exam).complete, {
		subjectId: subject.id,
		unitIndex,
	});
	updateSubjectProgress(currentSubjectProgress, subject.unitCount);
});

window.addEventListener("storage", (event) => {
	if (event.key === WEEKLY_SCHEDULE_STORAGE_KEY || event.key === null) {
		updateWeeklySessionCount();
	}
});

window.addEventListener("pageshow", updateWeeklySessionCount);
