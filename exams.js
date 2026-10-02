function parseScore(value) {
	if (value === "" || value === null || value === undefined) {
		return null;
	}

	const score = Number(value);
	return Number.isFinite(score) ? score : null;
}

function validateExam(exam) {
	const minScore = parseScore(exam.minScore);
	const maxScore = parseScore(exam.maxScore);
	const score = parseScore(exam.score);

	if (minScore === null || maxScore === null) {
		return { complete: false, message: "أدخل الحد الأدنى والدرجة العظمى." };
	}

	if (maxScore < minScore) {
		return { complete: false, message: "يجب ألا تقل الدرجة العظمى عن الحد الأدنى." };
	}

	if (score === null) {
		return { complete: false, message: "أدخل الدرجة المسجلة لإكمال الامتحان." };
	}

	if (score < minScore || score > maxScore) {
		return {
			complete: false,
			message: `يجب أن تكون الدرجة بين ${minScore} و${maxScore}.`,
		};
	}

	return { complete: true, message: "تم تسجيل درجة صحيحة لهذا الامتحان." };
}
