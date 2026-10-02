const SUBJECTS = [
	{ id: "chemistry", title: "الكيمياء", unitCount: 6 },
	{ id: "physics", title: "الفيزياء", unitCount: 8 },
	{ id: "biology", title: "الأحياء", unitCount: 7 },
	{ id: "arabic", title: "اللغة العربية", unitCount: 12 },
	{ id: "english", title: "اللغة الإنجليزية", unitCount: 12 },
];

const UNIT_ORDINALS = [
	"الأولى",
	"الثانية",
	"الثالثة",
	"الرابعة",
	"الخامسة",
	"السادسة",
	"السابعة",
	"الثامنة",
	"التاسعة",
	"العاشرة",
	"الحادية عشرة",
	"الثانية عشرة",
];

function getUnitTitle(index) {
	return `الوحدة ${UNIT_ORDINALS[index]}`;
}
