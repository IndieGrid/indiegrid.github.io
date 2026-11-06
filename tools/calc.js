/* Pure calculator math for the IndieGrid tools. No network, storage, or DOM. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  root.IndieGridCalc = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function bad(message) {
    return { ok: false, error: message };
  }

  function finite(value) {
    return typeof value === "number" && Number.isFinite(value);
  }

  function taxSetAside(input) {
    var income = input.income;
    var percent = input.percent;
    var already = input.already;
    if (!finite(income) || income < 0) {
      return bad("Income received must be zero or more.");
    }
    if (!finite(percent) || percent < 0 || percent > 100) {
      return bad("Set-aside percent must be between 0 and 100.");
    }
    if (!finite(already) || already < 0) {
      return bad("Amount already set aside must be zero or more.");
    }
    var should = income * (percent / 100);
    var gap = should - already;
    return {
      ok: true,
      should: should,
      gap: gap,
      percent: percent
    };
  }

  function freelanceRate(input) {
    var takeHome = input.takeHome;
    var expenses = input.expenses;
    var percent = input.setAsidePercent;
    var hoursPerWeek = input.hoursPerWeek;
    var weeksOff = input.weeksOff;
    var nonBillable = input.nonBillablePercent;
    if (!finite(takeHome) || takeHome < 0) {
      return bad("Target take-home must be zero or more.");
    }
    if (!finite(expenses) || expenses < 0) {
      return bad("Business expenses must be zero or more.");
    }
    if (!finite(percent) || percent < 0 || percent >= 100) {
      return bad("Set-aside percent must be from 0 up to, but not including, 100.");
    }
    if (!finite(hoursPerWeek) || hoursPerWeek <= 0) {
      return bad("Billable hours per week must be greater than zero.");
    }
    if (!finite(weeksOff) || weeksOff < 0 || weeksOff >= 52) {
      return bad("Weeks off must be from 0 to 51.");
    }
    if (!finite(nonBillable) || nonBillable < 0 || nonBillable >= 100) {
      return bad("Non-billable percent must be from 0 up to, but not including, 100.");
    }
    var weeksWorked = 52 - weeksOff;
    var effectiveHoursPerWeek = hoursPerWeek * (1 - nonBillable / 100);
    var hoursYear = effectiveHoursPerWeek * weeksWorked;
    if (hoursYear <= 0) {
      return bad("Those hours leave nothing billable in the year.");
    }
    var revenue = (takeHome + expenses) / (1 - percent / 100);
    var hourly = revenue / hoursYear;
    var day = hourly * (effectiveHoursPerWeek / 5);
    var monthly = revenue / 12;
    return {
      ok: true,
      weeksWorked: weeksWorked,
      effectiveHoursPerWeek: effectiveHoursPerWeek,
      hoursYear: hoursYear,
      revenue: revenue,
      hourly: hourly,
      day: day,
      monthly: monthly
    };
  }

  function parseISODate(value) {
    var match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || "");
    if (!match) {
      return null;
    }
    var year = Number(match[1]);
    var month = Number(match[2]);
    var day = Number(match[3]);
    var date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
      return null;
    }
    return date;
  }

  function daysBetween(dueISO, todayISO) {
    var due = parseISODate(dueISO);
    var today = parseISODate(todayISO);
    if (!due || !today) {
      return null;
    }
    return Math.round((today.getTime() - due.getTime()) / 86400000);
  }

  function lateFee(input) {
    var amount = input.amount;
    var grace = input.graceDays;
    var mode = input.mode;
    var rate = input.rate;
    var flat = input.flat;
    var past = daysBetween(input.due, input.today);
    if (!finite(amount) || amount < 0) {
      return bad("Invoice amount must be zero or more.");
    }
    if (past === null) {
      return bad("Enter a real due date and today’s date.");
    }
    if (!finite(grace) || grace < 0 || Math.floor(grace) !== grace) {
      return bad("Grace period must be a whole number of days, zero or more.");
    }
    if (mode !== "monthly" && mode !== "annual" && mode !== "flat") {
      return bad("Choose a monthly percent, an annual percent, or a flat fee.");
    }
    if (mode === "flat") {
      if (!finite(flat) || flat < 0) {
        return bad("Flat fee must be zero or more.");
      }
    } else if (!finite(rate) || rate < 0) {
      return bad("Percent must be zero or more.");
    }
    var daysLate = Math.max(0, past - grace);
    var fee = 0;
    if (daysLate > 0 && mode === "flat") {
      fee = flat;
    } else if (daysLate > 0 && mode === "monthly") {
      fee = amount * (rate / 100) * (daysLate / 30);
    } else if (daysLate > 0 && mode === "annual") {
      fee = amount * (rate / 100) * (daysLate / 365);
    }
    return {
      ok: true,
      daysPastDue: Math.max(0, past),
      daysLate: daysLate,
      fee: fee,
      notYetDue: past < 0
    };
  }

  return {
    taxSetAside: taxSetAside,
    freelanceRate: freelanceRate,
    lateFee: lateFee,
    daysBetween: daysBetween
  };
});
