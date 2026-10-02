const SUBJECT_PROGRESS_KEY = "study-system-2027.subject-progress.v1";
const WEEKLY_SCHEDULE_STORAGE_KEY = "study-system-2027.weekly-schedule";
const WEEKLY_STATISTICS_KEY = "study-system-2027.weekly-statistics.v1";

function createEmptySubjectProgress(subject) {
	return {
		units: Array.from({ length: subject.unitCount }, () => ({
			studied: false,
			exam: { minScore: 0, maxScore: 100, score: null },
		})),
	};
}

function readStoredScore(value, fallback) {
	if (value === null || value === undefined || value === "") {
		return fallback;
	}

	const score = Number(value);
	return Number.isFinite(score) ? score : fallback;
}

function normalizeSubjectProgress(savedProgress) {
	return Object.fromEntries(
		SUBJECTS.map((subject) => {
			const defaults = createEmptySubjectProgress(subject);
			const savedUnits = Array.isArray(savedProgress?.[subject.id]?.units)
				? savedProgress[subject.id].units
				: [];
			const units = defaults.units.map((defaultUnit, index) => {
				const savedUnit = savedUnits[index];
				const savedExam = savedUnit?.exam ?? {};

				return {
					studied: Boolean(savedUnit?.studied),
					exam: {
						minScore: readStoredScore(savedExam.minScore, defaultUnit.exam.minScore),
						maxScore: readStoredScore(savedExam.maxScore, defaultUnit.exam.maxScore),
						score: readStoredScore(savedExam.score, defaultUnit.exam.score),
					},
				};
			});

			return [subject.id, { units }];
		}),
	);
}

function loadSubjectProgress() {
	try {
		const savedProgress = localStorage.getItem(SUBJECT_PROGRESS_KEY);
		return normalizeSubjectProgress(savedProgress ? JSON.parse(savedProgress) : {});
	} catch {
		return normalizeSubjectProgress({});
	}
}

function saveSubjectProgress(progress) {
	localStorage.setItem(SUBJECT_PROGRESS_KEY, JSON.stringify(progress));
}

function loadWeeklySchedule() {
	try {
		const savedSchedule = localStorage.getItem(WEEKLY_SCHEDULE_STORAGE_KEY);
		const schedule = savedSchedule ? JSON.parse(savedSchedule) : {};
		return schedule && typeof schedule === "object" && !Array.isArray(schedule) ? schedule : {};
	} catch {
		return {};
	}
}

function getWeeklyStatisticsWeekInfo(value = Date.now()) {
	const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
	if (!Number.isFinite(date.getTime())) {
		return null;
	}

	const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
	start.setDate(start.getDate() - ((start.getDay() + 1) % 7));
	const end = new Date(start);
	end.setDate(start.getDate() + 6);
	const toDateKey = (day) => `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
	const weekStartDate = toDateKey(start);

	return {
		weekId: weekStartDate,
		weekStartDate,
		weekEndDate: toDateKey(end),
	};
}

function createWeeklyStatisticsState() {
	return {
		version: 1,
		nextEventSequence: 0,
		transitionStates: { units: {}, exams: {}, sessions: {} },
		weeks: {},
	};
}

function loadWeeklyStatistics() {
	try {
		const stored = localStorage.getItem(WEEKLY_STATISTICS_KEY);
		if (!stored) {
			return createWeeklyStatisticsState();
		}

		const parsed = JSON.parse(stored);
		if (!parsed || parsed.version !== 1 || !parsed.weeks || typeof parsed.weeks !== "object") {
			return createWeeklyStatisticsState();
		}

		return {
			version: 1,
			nextEventSequence: Number.isSafeInteger(parsed.nextEventSequence) ? parsed.nextEventSequence : 0,
			transitionStates: {
				units: parsed.transitionStates?.units ?? {},
				exams: parsed.transitionStates?.exams ?? {},
				sessions: parsed.transitionStates?.sessions ?? {},
			},
			weeks: parsed.weeks,
		};
	} catch {
		return createWeeklyStatisticsState();
	}
}

function saveWeeklyStatistics(state) {
	localStorage.setItem(WEEKLY_STATISTICS_KEY, JSON.stringify(state));
}

function ensureWeeklyStatisticsWeek(state, weekInfo) {
	if (!state.weeks[weekInfo.weekId]) {
		state.weeks[weekInfo.weekId] = {
			...weekInfo,
			completedUnits: {},
			completedExams: {},
			completedSessions: {},
			assignedSessions: {},
		};
	}

	return state.weeks[weekInfo.weekId];
}

function syncWeeklyAssignedSessions(state, week, schedule) {
	let changed = false;
	for (const [dayId, daySlots] of Object.entries(schedule)) {
		if (!Array.isArray(daySlots)) {
			continue;
		}

		daySlots.forEach((slot, slotIndex) => {
			if (!slot?.subject) {
				return;
			}

			const slotId = `${dayId}:${slotIndex}`;
			if (week.assignedSessions[slotId] !== slot.subject) {
				week.assignedSessions[slotId] = slot.subject;
				changed = true;
			}
		});
	}

	return changed;
}

function syncCurrentWeeklyAssignments(schedule = loadWeeklySchedule(), now = Date.now()) {
	const weekInfo = getWeeklyStatisticsWeekInfo(now);
	if (!weekInfo) {
		return null;
	}

	const state = loadWeeklyStatistics();
	const isNewWeek = !state.weeks[weekInfo.weekId];
	const week = ensureWeeklyStatisticsWeek(state, weekInfo);
	if (syncWeeklyAssignedSessions(state, week, schedule) || isNewWeek) {
		saveWeeklyStatistics(state);
	}

	return week;
}

function getWeeklyStatisticsSummary(week) {
	const completedUnits = Object.values(week.completedUnits ?? {});
	const completedExams = Object.values(week.completedExams ?? {});
	const completedSessions = Object.values(week.completedSessions ?? {});
	const assignedSessions = Object.entries(week.assignedSessions ?? {});
	const assignedCount = assignedSessions.length;
	const completedCount = completedSessions.length;

	return {
		weekId: week.weekId,
		weekStartDate: week.weekStartDate,
		weekEndDate: week.weekEndDate,
		completedUnits: completedUnits.length,
		completedExams: completedExams.length,
		completedSessions: completedCount,
		assignedSessions: assignedCount,
		sessionCompletionPercentage: assignedCount ? Math.min(100, Math.round((completedCount / assignedCount) * 100)) : 0,
		subjects: SUBJECTS.map((subject) => {
			const assigned = assignedSessions.filter(([, subjectId]) => subjectId === subject.id).length;
			const bySubject = (events) => events.filter((event) => event.subjectId === subject.id).length;
			return {
				subjectId: subject.id,
				title: subject.title,
				completedUnits: bySubject(completedUnits),
				completedExams: bySubject(completedExams),
				completedSessions: bySubject(completedSessions),
				assignedSessions: assigned,
			};
		}),
	};
}

function getWeeklyStatisticsReport(now = Date.now(), schedule = loadWeeklySchedule()) {
	const weekInfo = getWeeklyStatisticsWeekInfo(now);
	if (!weekInfo) {
		return { current: null, weeks: [] };
	}

	const state = loadWeeklyStatistics();
	const currentWeek = ensureWeeklyStatisticsWeek(state, weekInfo);
	const assignmentsChanged = syncWeeklyAssignedSessions(state, currentWeek, schedule);
	if (assignmentsChanged || !localStorage.getItem(WEEKLY_STATISTICS_KEY)) {
		saveWeeklyStatistics(state);
	}

	const weeks = Object.values(state.weeks)
		.filter((week) => week && typeof week.weekStartDate === "string")
		.map(getWeeklyStatisticsSummary)
		.sort((first, second) => first.weekStartDate.localeCompare(second.weekStartDate));

	return {
		current: getWeeklyStatisticsSummary(currentWeek),
		weeks,
	};
}

function recordWeeklyCompletion(type, entityId, wasComplete, isComplete, metadata = {}, now = Date.now()) {
	const eventsByType = {
		units: "completedUnits",
		exams: "completedExams",
		sessions: "completedSessions",
	};
	const eventCollection = eventsByType[type];
	if (!eventCollection || Boolean(wasComplete) === Boolean(isComplete)) {
		return false;
	}

	const state = loadWeeklyStatistics();
	const transitionStates = state.transitionStates[type] ?? (state.transitionStates[type] = {});
	const nextState = Boolean(isComplete);
	if (transitionStates[entityId] === nextState) {
		return false;
	}
	transitionStates[entityId] = nextState;

	let recorded = false;
	if (!wasComplete && isComplete) {
		const weekInfo = getWeeklyStatisticsWeekInfo(now);
		if (!weekInfo) {
			return false;
		}

		const week = ensureWeeklyStatisticsWeek(state, weekInfo);
		const schedule = loadWeeklySchedule();
		syncWeeklyAssignedSessions(state, week, schedule);
		const sessionKey = type === "sessions" ? metadata.slotId ?? entityId : null;
		if (sessionKey && week[eventCollection][sessionKey]) {
			saveWeeklyStatistics(state);
			return false;
		}

		state.nextEventSequence += 1;
		const eventId = `${weekInfo.weekId}:${type}:${state.nextEventSequence}`;
		week[eventCollection][sessionKey ?? eventId] = {
			...metadata,
			entityId,
			eventId,
			completedAt: new Date(now).toISOString(),
		};
		recorded = true;
	}

	saveWeeklyStatistics(state);
	return recorded;
}
