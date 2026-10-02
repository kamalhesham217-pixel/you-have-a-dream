function formatDashboardNumber(value) {
	return new Intl.NumberFormat("ar-EG", { useGrouping: false }).format(value);
}

function createDashboardElement(tagName, className, text) {
	const element = document.createElement(tagName);
	if (className) {
		element.className = className;
	}
	if (text !== undefined) {
		element.textContent = text;
	}
	return element;
}

function createSubjectSummaryMetric(label, value) {
	const metric = createDashboardElement("div", "subject-summary-metric");
	metric.append(
		createDashboardElement("span", "subject-summary-label", label),
		createDashboardElement("strong", "subject-summary-value", value),
	);
	return metric;
}

function createSubjectSummaryCard(summary) {
	const card = createDashboardElement("a", "subject-summary");
	card.href = `pages/${summary.id}.html`;
	card.setAttribute("aria-label", `ملخص مادة ${summary.title}`);

	const heading = createDashboardElement("div", "subject-summary-heading");
	heading.append(
		createDashboardElement("h3", "", summary.title),
		createDashboardElement("span", "summary-arrow", "←"),
	);

	const stats = createDashboardElement("div", "subject-summary-stats");
	stats.append(
		createSubjectSummaryMetric("الوحدات", `${formatDashboardNumber(summary.completedUnits)} / ${formatDashboardNumber(summary.totalUnits)}`),
		createSubjectSummaryMetric("الامتحانات", `${formatDashboardNumber(summary.completedExams)} / ${formatDashboardNumber(summary.totalExams)}`),
		createSubjectSummaryMetric("جلسات المذاكرة", formatDashboardNumber(summary.scheduledStudySessions)),
		createSubjectSummaryMetric("الوحدات المتبقية", formatDashboardNumber(Math.max(0, summary.totalUnits - summary.completedUnits))),
		createSubjectSummaryMetric("الامتحانات المتبقية", formatDashboardNumber(Math.max(0, summary.totalExams - summary.completedExams))),
	);

	const progressHeading = createDashboardElement("div", "subject-summary-progress-heading");
	progressHeading.append(
		createDashboardElement("span", "", "إنجاز الوحدات"),
		createDashboardElement("span", "", `${formatDashboardNumber(summary.unitPercentage)}٪`),
	);
	const progressTrack = createDashboardElement("span", "subject-summary-track");
	progressTrack.setAttribute("role", "progressbar");
	progressTrack.setAttribute("aria-label", `إنجاز وحدات ${summary.title}`);
	progressTrack.setAttribute("aria-valuemin", "0");
	progressTrack.setAttribute("aria-valuemax", String(summary.totalUnits));
	progressTrack.setAttribute("aria-valuenow", String(summary.completedUnits));
	const progressFill = createDashboardElement("span", "subject-summary-fill");
	progressFill.style.width = `${summary.unitPercentage}%`;
	progressTrack.append(progressFill);
	card.append(heading, stats, progressHeading, progressTrack);
	return card;
}

function formatWeeklyDate(dateValue) {
	const date = new Date(`${dateValue}T12:00:00`);
	return new Intl.DateTimeFormat("ar-EG", { day: "numeric", month: "short" }).format(date);
}

function createWeeklySubjectSummary(summary) {
	const item = createDashboardElement("article", "weekly-subject-summary");
	item.append(createDashboardElement("h4", "", summary.title));
	const values = createDashboardElement("div", "weekly-subject-values");
	for (const [label, value] of [
		["وحدات", summary.completedUnits],
		["امتحانات", summary.completedExams],
		["جلسات", summary.completedSessions],
	]) {
		const metric = createDashboardElement("div", "weekly-subject-value");
		metric.append(
			createDashboardElement("span", "", label),
			createDashboardElement("strong", "", formatDashboardNumber(value)),
		);
		values.append(metric);
	}
	item.append(values);
	return item;
}

function createWeeklyHistoryRow(summary, currentWeekId) {
	const row = document.createElement("tr");
	const isCurrent = summary.weekId === currentWeekId;
	if (isCurrent) {
		row.classList.add("is-current-week");
	}

	const cells = [
		`${formatWeeklyDate(summary.weekStartDate)} – ${formatWeeklyDate(summary.weekEndDate)}${isCurrent ? " · الحالي" : ""}`,
		formatDashboardNumber(summary.completedUnits),
		formatDashboardNumber(summary.completedExams),
		formatDashboardNumber(summary.completedSessions),
		formatDashboardNumber(summary.assignedSessions),
		`${formatDashboardNumber(summary.sessionCompletionPercentage)}٪`,
	];
	for (const value of cells) {
		const cell = document.createElement("td");
		cell.textContent = value;
		row.append(cell);
	}
	return row;
}

function createDashboardExamSubject(summary) {
	const item = createDashboardElement("article", "exam-performance-subject");
	item.append(createDashboardElement("h3", "", summary.title));
	const metrics = createDashboardElement("div", "exam-performance-subject-metrics");
	metrics.append(
		createDashboardElement("span", "", `${formatDashboardNumber(summary.examsWithScores)} / ${formatDashboardNumber(summary.totalExams)} امتحان`),
		createDashboardElement("strong", "", formatExamPerformancePercentage(summary.averagePercentage)),
	);
	item.append(metrics);
	return item;
}

function renderDashboardExamPerformance() {
	const performance = getOverallExamPerformance();
	document.querySelector("#dashboard-exams-scored").textContent = `${formatDashboardNumber(performance.examsWithScores)} / ${formatDashboardNumber(performance.totalExams)}`;
	document.querySelector("#dashboard-exams-average").textContent = formatExamPerformancePercentage(performance.averagePercentage);
	document.querySelector("#dashboard-exams-highest").textContent = formatExamPerformancePercentage(performance.highestPercentage);
	document.querySelector("#dashboard-exams-lowest").textContent = formatExamPerformancePercentage(performance.lowestPercentage);
	document.querySelector("#dashboard-exam-subjects").replaceChildren(...performance.subjects.map(createDashboardExamSubject));
}

function createChartElement(tagName, attributes, text) {
	const element = document.createElementNS("http://www.w3.org/2000/svg", tagName);
	for (const [name, value] of Object.entries(attributes)) {
		element.setAttribute(name, String(value));
	}
	if (text !== undefined) {
		element.textContent = text;
	}
	return element;
}

function renderWeeklyUnitsChart(weeks, currentWeekId) {
	const chart = document.querySelector("#weekly-units-chart");
	const note = document.querySelector("#weekly-chart-note");
	const width = Math.max(420, weeks.length * 86 + 70);
	const height = 220;
	const left = 42;
	const right = 16;
	const top = 18;
	const bottom = 42;
	const chartHeight = height - top - bottom;
	const plotWidth = width - left - right;
	const maximumUnits = Math.max(1, ...weeks.map((week) => week.completedUnits));
	const baseline = height - bottom;
	const step = weeks.length ? plotWidth / weeks.length : plotWidth;
	const barWidth = Math.min(34, step * 0.55);
	const elements = [];

	for (const tick of [0, maximumUnits]) {
		const y = baseline - (tick / maximumUnits) * chartHeight;
		elements.push(createChartElement("line", { x1: left, y1: y, x2: width - right, y2: y, class: "weekly-chart-gridline" }));
		elements.push(createChartElement("text", { x: left - 9, y: y + 4, "text-anchor": "end", class: "weekly-chart-axis-label" }, formatDashboardNumber(tick)));
	}

	weeks.forEach((week, index) => {
		const center = left + step * (index + 0.5);
		const barHeight = (week.completedUnits / maximumUnits) * chartHeight;
		const bar = createChartElement("rect", {
			x: center - barWidth / 2,
			y: baseline - barHeight,
			width: barWidth,
			height: barHeight,
			rx: 3,
			class: week.weekId === currentWeekId ? "weekly-chart-bar is-current" : "weekly-chart-bar",
		});
		bar.append(createChartElement("title", {}, `${formatWeeklyDate(week.weekStartDate)} – ${formatWeeklyDate(week.weekEndDate)}: ${week.completedUnits} وحدات`));
		elements.push(bar);
		if (week.completedUnits === 0) {
			elements.push(createChartElement("circle", { cx: center, cy: baseline, r: 3, class: "weekly-chart-zero" }));
		}
		elements.push(createChartElement("text", {
			x: center,
			y: height - 12,
			"text-anchor": "middle",
			class: "weekly-chart-week-label",
		}, formatWeeklyDate(week.weekStartDate)));
	});

	chart.setAttribute("viewBox", `0 0 ${width} ${height}`);
	chart.replaceChildren(...elements);
	note.hidden = weeks.length > 1;
}

let latestWeeklyStatistics = null;

function renderWeeklyStatisticsDashboard() {
	const report = getWeeklyStatisticsReport();
	if (!report.current) {
		return null;
	}

	latestWeeklyStatistics = report;
	const current = report.current;
	document.querySelector("#weekly-current-range").textContent = `${formatWeeklyDate(current.weekStartDate)} – ${formatWeeklyDate(current.weekEndDate)}`;
	document.querySelector("#weekly-current-units").textContent = formatDashboardNumber(current.completedUnits);
	document.querySelector("#weekly-current-exams").textContent = formatDashboardNumber(current.completedExams);
	document.querySelector("#weekly-current-completed-sessions").textContent = formatDashboardNumber(current.completedSessions);
	document.querySelector("#weekly-current-assigned-sessions").textContent = formatDashboardNumber(current.assignedSessions);
	document.querySelector("#weekly-current-session-percent").textContent = `${formatDashboardNumber(current.sessionCompletionPercentage)}٪`;
	document.querySelector("#weekly-subject-grid").replaceChildren(...current.subjects.map(createWeeklySubjectSummary));
	document.querySelector("#weekly-history-rows").replaceChildren(
		...report.weeks.map((week) => createWeeklyHistoryRow(week, current.weekId)),
	);
	renderWeeklyUnitsChart(report.weeks, current.weekId);
	return report;
}

function renderDashboardProgress() {
	const progress = getOverallProgress();
	latestDashboardProgress = progress;
	const weeklyStatistics = renderWeeklyStatisticsDashboard();
	renderDashboardExamPerformance();
	document.querySelector("#overall-units-count").textContent = `${formatDashboardNumber(progress.completedUnits)} / ${formatDashboardNumber(progress.totalUnits)}`;
	document.querySelector("#overall-exams-count").textContent = `${formatDashboardNumber(progress.completedExams)} / ${formatDashboardNumber(progress.totalExams)}`;
	document.querySelector("#overall-sessions-count").textContent = formatDashboardNumber(progress.scheduledStudySessions);
	renderStudyPlan(progress, Date.now(), weeklyStatistics?.current);

	const meters = [
		{ selector: "#overall-unit-meter", percentage: progress.unitPercentage },
		{ selector: "#overall-exam-meter", percentage: progress.examPercentage },
	];
	for (const meter of meters) {
		const element = document.querySelector(meter.selector);
		element.querySelector(".overall-meter-fill").style.width = `${meter.percentage}%`;
		element.querySelector(".overall-meter-track").setAttribute("aria-valuenow", String(meter.percentage));
		element.querySelector(".overall-meter-heading strong").textContent = `${formatDashboardNumber(meter.percentage)}٪`;
	}

	document.querySelector("#subject-summaries").replaceChildren(
		...progress.subjects.map(createSubjectSummaryCard),
	);
}

let latestDashboardProgress = null;

function formatPlanningNumber(value, maximumFractionDigits = 0) {
	return new Intl.NumberFormat("ar-EG", {
		maximumFractionDigits,
		useGrouping: false,
	}).format(value);
}

function getRequiredWeeklyWorkload(remaining, remainingMilliseconds) {
	if (remaining <= 0) {
		return 0;
	}
	if (remainingMilliseconds <= 0) {
		return null;
	}

	return Math.round((remaining * 7 * dayLength / remainingMilliseconds) * 10) / 10;
}

function renderStudyPlan(progress, now, weeklyStatistics = latestWeeklyStatistics?.current) {
	const planningPeriod = examTime - startTime;
	const elapsedPercentage = planningPeriod > 0
		? Math.max(0, Math.min(100, ((now - startTime) / planningPeriod) * 100))
		: now >= examTime ? 100 : 0;
	const targetPercentage = Math.round(elapsedPercentage * 10) / 10;
	const remainingMilliseconds = Math.max(0, examTime - now);
	const remainingDays = Math.floor(remainingMilliseconds / dayLength);
	const remainingUnits = Math.max(0, progress.totalUnits - progress.completedUnits);
	const remainingExams = Math.max(0, progress.totalExams - progress.completedExams);
	const unitsPerWeek = getRequiredWeeklyWorkload(remainingUnits, remainingMilliseconds);
	const examsPerWeek = getRequiredWeeklyWorkload(remainingExams, remainingMilliseconds);
	const actualPercentage = progress.unitPercentage;
	const difference = Math.round((actualPercentage - targetPercentage) * 10) / 10;
	const comparisonTrack = document.querySelector("#plan-comparison-track");
	const status = document.querySelector("#plan-progress-status");
	const statusName = difference > 0.5 ? "ahead" : difference < -0.5 ? "behind" : "on-target";
	const statusLabel = statusName === "ahead"
		? "متقدم عن المستهدف"
		: statusName === "behind" ? "متأخر عن المستهدف" : "على المسار المستهدف";

	document.querySelector("#plan-total-units").textContent = formatPlanningNumber(progress.totalUnits);
	document.querySelector("#plan-completed-units").textContent = formatPlanningNumber(progress.completedUnits);
	document.querySelector("#plan-remaining-units").textContent = formatPlanningNumber(remainingUnits);
	document.querySelector("#plan-remaining-exams").textContent = formatPlanningNumber(remainingExams);
	document.querySelector("#plan-remaining-days").textContent = formatPlanningNumber(remainingDays);
	document.querySelector("#plan-units-per-week").textContent = unitsPerWeek === null ? "—" : formatPlanningNumber(unitsPerWeek, 1);
	document.querySelector("#plan-exams-per-week").textContent = examsPerWeek === null ? "—" : formatPlanningNumber(examsPerWeek, 1);
	document.querySelector("#plan-actual-percent").textContent = `${formatPlanningNumber(actualPercentage)}٪`;
	document.querySelector("#plan-target-percent").textContent = `${formatPlanningNumber(targetPercentage, 1)}٪`;
	document.querySelector("#plan-progress-difference").textContent = `${difference > 0 ? "+" : difference < 0 ? "−" : ""}${formatPlanningNumber(Math.abs(difference), 1)}٪`;
	document.querySelector(".plan-actual-fill").style.width = `${actualPercentage}%`;
	document.querySelector(".plan-target-marker").style.right = `${targetPercentage}%`;
	comparisonTrack.setAttribute("aria-label", `الإنجاز الفعلي ${actualPercentage}%، والمستهدف ${targetPercentage}%`);
	status.className = `plan-status is-${statusName}`;
	status.textContent = statusLabel;
	document.querySelector("#plan-deadline-note").hidden = remainingMilliseconds > 0 || (remainingUnits === 0 && remainingExams === 0);
	document.querySelector("#plan-week-units").textContent = formatPlanningNumber(weeklyStatistics?.completedUnits ?? 0);
	document.querySelector("#plan-week-exams").textContent = formatPlanningNumber(weeklyStatistics?.completedExams ?? 0);
	document.querySelector("#plan-week-sessions").textContent = formatPlanningNumber(weeklyStatistics?.completedSessions ?? 0);
}

renderDashboardProgress();

window.addEventListener("countdownupdate", (event) => {
	if (latestDashboardProgress) {
		renderStudyPlan(latestDashboardProgress, event.detail.now, latestWeeklyStatistics?.current);
	}
});

window.addEventListener("storage", (event) => {
	if (event.key === SUBJECT_PROGRESS_KEY || event.key === WEEKLY_SCHEDULE_STORAGE_KEY || event.key === WEEKLY_STATISTICS_KEY || event.key === null) {
		renderDashboardProgress();
	}
});

window.addEventListener("pageshow", renderDashboardProgress);
