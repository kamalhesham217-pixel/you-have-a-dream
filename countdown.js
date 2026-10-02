const timeZone = "Africa/Cairo";
const egyptTimeFormatter = new Intl.DateTimeFormat("en-GB", {
	timeZone,
	year: "numeric",
	month: "2-digit",
	day: "2-digit",
	hour: "2-digit",
	minute: "2-digit",
	second: "2-digit",
	hourCycle: "h23",
});

function egyptLocalMidnight(year, month, day) {
	const desiredUtc = Date.UTC(year, month - 1, day);
	let timestamp = desiredUtc;

	for (let attempt = 0; attempt < 3; attempt += 1) {
		const parts = Object.fromEntries(
			egyptTimeFormatter
				.formatToParts(new Date(timestamp))
				.filter(({ type }) => type !== "literal")
				.map(({ type, value }) => [type, Number(value)]),
		);
		const localTimeAsUtc = Date.UTC(
			parts.year,
			parts.month - 1,
			parts.day,
			parts.hour,
			parts.minute,
			parts.second,
		);

		timestamp += desiredUtc - localTimeAsUtc;
	}

	return timestamp;
}

const startTime = egyptLocalMidnight(2026, 10, 2);
const examTime = egyptLocalMidnight(2027, 6, 26);
const dayLength = 24 * 60 * 60 * 1000;
const hourLength = 60 * 60 * 1000;
const minuteLength = 60 * 1000;
const numberFormat = new Intl.NumberFormat("ar-EG", { useGrouping: false });
const percentFormat = new Intl.NumberFormat("ar-EG", {
	minimumFractionDigits: 1,
	maximumFractionDigits: 1,
	useGrouping: false,
});

const fields = {
	days: document.querySelector("#days"),
	hours: document.querySelector("#hours"),
	minutes: document.querySelector("#minutes"),
	seconds: document.querySelector("#seconds"),
	percent: document.querySelector("#progress-percent"),
	ring: document.querySelector(".ring-value"),
	progress: document.querySelector(".progress-ring"),
};

const ringLength = fields.ring.getTotalLength();
fields.ring.style.strokeDasharray = `${ringLength}`;

function renderCountdown() {
	const now = Date.now();
	const remaining = Math.max(0, examTime - now);
	const totalSeconds = Math.floor(remaining / 1000);
	const days = Math.floor(totalSeconds / 86400);
	const hours = Math.floor((totalSeconds % 86400) / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;

	fields.days.textContent = numberFormat.format(days);
	fields.hours.textContent = numberFormat.format(hours).padStart(2, "٠");
	fields.minutes.textContent = numberFormat.format(minutes).padStart(2, "٠");
	fields.seconds.textContent = numberFormat.format(seconds).padStart(2, "٠");

	const remainingRatio = Math.max(0, Math.min(1, (examTime - now) / (examTime - startTime)));
	const remainingPercent = remainingRatio * 100;
	const roundedPercent = Math.round(remainingPercent * 10) / 10;

	fields.percent.textContent = `${percentFormat.format(roundedPercent)}٪`;
	fields.ring.style.strokeDashoffset = `${ringLength * (1 - remainingRatio)}`;
	fields.progress.setAttribute("aria-valuenow", `${Math.round(remainingPercent)}`);
	fields.progress.setAttribute("aria-valuetext", `${percentFormat.format(roundedPercent)}٪`);
	window.dispatchEvent(new CustomEvent("countdownupdate", { detail: { now } }));
}

renderCountdown();
window.setInterval(renderCountdown, 1000);
