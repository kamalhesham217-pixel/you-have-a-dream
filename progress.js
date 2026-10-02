function calculateSubjectProgress(subjectProgress) {
	return {
		completedUnits: subjectProgress.units.filter((unit) => unit.studied).length,
		completedExams: subjectProgress.units.filter((unit) => validateExam(unit.exam).complete).length,
	};
}

function getScoredExamRecords(subjectProgress) {
	return subjectProgress.units.flatMap((unit, unitIndex) => {
		const exam = unit.exam ?? {};
		const earnedScore = parseScore(exam.score);
		if (earnedScore === null) {
			return [];
		}

		const minimumScore = parseScore(exam.minScore);
		const maximumScore = parseScore(exam.maxScore);
		const percentage = minimumScore === null || maximumScore === null || maximumScore <= minimumScore
			? null
			: ((earnedScore - minimumScore) / (maximumScore - minimumScore)) * 100;

		return [{
			unitIndex,
			earnedScore,
			minimumScore,
			maximumScore,
			percentage: Number.isFinite(percentage) ? percentage : null,
		}];
	});
}

function summarizeExamScores(records) {
	const percentages = records.map(({ percentage }) => percentage).filter(Number.isFinite);
	return {
		examsWithScores: records.length,
		averagePercentage: percentages.length
			? percentages.reduce((total, percentage) => total + percentage, 0) / percentages.length
			: null,
		highestPercentage: percentages.length ? Math.max(...percentages) : null,
		lowestPercentage: percentages.length ? Math.min(...percentages) : null,
	};
}

function formatExamPerformancePercentage(value) {
	if (!Number.isFinite(value)) {
		return "—";
	}

	const clampedPercentage = Math.min(100, Math.max(0, value));
	const roundedPercentage = Math.round(clampedPercentage * 10) / 10;
	return `${new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 1, useGrouping: false }).format(roundedPercentage)}٪`;
}

function getSubjectExamPerformance(subjectId, allProgress = loadSubjectProgress()) {
	const subject = SUBJECTS.find(({ id }) => id === subjectId);
	if (!subject) {
		return null;
	}

	const subjectProgress = allProgress[subjectId] ?? createEmptySubjectProgress(subject);
	return {
		subjectId,
		title: subject.title,
		totalExams: subject.unitCount,
		...summarizeExamScores(getScoredExamRecords(subjectProgress)),
	};
}

function getOverallExamPerformance() {
	const allProgress = loadSubjectProgress();
	const subjectRecords = SUBJECTS.map((subject) => ({
		subject,
		records: getScoredExamRecords(allProgress[subject.id] ?? createEmptySubjectProgress(subject)),
	}));
	const subjects = subjectRecords.map(({ subject, records }) => ({
		subjectId: subject.id,
		title: subject.title,
		totalExams: subject.unitCount,
		...summarizeExamScores(records),
	}));
	const allRecords = subjectRecords.flatMap(({ records }) => records);
	const totalExams = SUBJECTS.reduce((total, subject) => total + subject.unitCount, 0);

	return {
		totalExams,
		...summarizeExamScores(allRecords),
		subjects,
	};
}

function getScheduledStudySessions(subjectId, schedule = loadWeeklySchedule()) {
	return Object.values(schedule).reduce((total, daySlots) => {
		if (!Array.isArray(daySlots)) {
			return total;
		}

		return total + daySlots.filter((slot) => slot?.subject === subjectId && slot.studied === true).length;
	}, 0);
}

function getCompletedScheduledStudySessions(schedule = loadWeeklySchedule()) {
	return Object.values(schedule).reduce((total, daySlots) => {
		if (!Array.isArray(daySlots)) {
			return total;
		}

		return total + daySlots.filter((slot) => slot?.studied === true).length;
	}, 0);
}

function getSubjectSummary(subjectId, allProgress = loadSubjectProgress(), schedule = loadWeeklySchedule()) {
	const subject = SUBJECTS.find(({ id }) => id === subjectId);
	if (!subject) {
		return null;
	}

	const progress = calculateSubjectProgress(allProgress[subjectId] ?? createEmptySubjectProgress(subject));
	return {
		...subject,
		...progress,
		totalUnits: subject.unitCount,
		totalExams: subject.unitCount,
		unitPercentage: subject.unitCount ? Math.round((progress.completedUnits / subject.unitCount) * 100) : 0,
		examPercentage: subject.unitCount ? Math.round((progress.completedExams / subject.unitCount) * 100) : 0,
		scheduledStudySessions: getScheduledStudySessions(subjectId, schedule),
	};
}

function getOverallProgress() {
	const allProgress = loadSubjectProgress();
	const schedule = loadWeeklySchedule();
	const subjects = SUBJECTS.map(({ id }) => getSubjectSummary(id, allProgress, schedule));
	const totals = subjects.reduce((result, subject) => ({
		completedUnits: result.completedUnits + subject.completedUnits,
		totalUnits: result.totalUnits + subject.totalUnits,
		completedExams: result.completedExams + subject.completedExams,
		totalExams: result.totalExams + subject.totalExams,
	}), {
		completedUnits: 0,
		totalUnits: 0,
		completedExams: 0,
		totalExams: 0,
	});

	return {
		...totals,
		scheduledStudySessions: getCompletedScheduledStudySessions(schedule),
		unitPercentage: totals.totalUnits ? Math.round((totals.completedUnits / totals.totalUnits) * 100) : 0,
		examPercentage: totals.totalExams ? Math.round((totals.completedExams / totals.totalExams) * 100) : 0,
		subjects,
	};
}

function updateSubjectProgress(subjectProgress, unitCount) {
	const progress = calculateSubjectProgress(subjectProgress);
	const metrics = [
		{ id: "unit-progress", label: "الوحدات المكتملة", completed: progress.completedUnits },
		{ id: "exam-progress", label: "الامتحانات المكتملة", completed: progress.completedExams },
	];

	for (const metric of metrics) {
		const section = document.querySelector(`#${metric.id}`);
		const count = section.querySelector(".metric-count");
		const bar = section.querySelector(".metric-fill");
		const track = section.querySelector(".metric-track");
		const percentage = unitCount === 0 ? 0 : (metric.completed / unitCount) * 100;

		count.textContent = `${new Intl.NumberFormat("ar-EG", { useGrouping: false }).format(metric.completed)} / ${new Intl.NumberFormat("ar-EG", { useGrouping: false }).format(unitCount)}`;
		bar.style.width = `${percentage}%`;
		track.setAttribute("aria-valuenow", String(metric.completed));
		track.setAttribute("aria-valuetext", `${metric.label}: ${metric.completed} من ${unitCount}`);
	}

	return progress;
}
