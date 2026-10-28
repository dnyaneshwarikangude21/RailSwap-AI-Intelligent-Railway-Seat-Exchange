const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function isValidEmail(value) {
  return EMAIL_PATTERN.test(String(value || "").trim());
}

export function validateLogin(values) {
  const errors = {};
  if (!values.email?.trim()) {
    errors.email = "Email is required.";
  } else if (!isValidEmail(values.email)) {
    errors.email = "Enter a valid email address.";
  }
  if (!values.password) {
    errors.password = "Password is required.";
  }
  return errors;
}

export function validateRegistration(values) {
  const errors = validateLogin(values);
  if (!values.display_name?.trim()) {
    errors.display_name = "Display name is required.";
  } else if (values.display_name.trim().length < 2) {
    errors.display_name = "Use at least 2 characters.";
  }
  if (!values.password || values.password.length < 8) {
    errors.password = "Use at least 8 characters.";
  }
  if (values.confirm_password !== values.password) {
    errors.confirm_password = "Passwords do not match.";
  }
  return errors;
}

export function validatePreference(values) {
  const errors = {};
  const allowed = ["LOWER", "MIDDLE", "UPPER", "SIDE_LOWER", "SIDE_UPPER"];
  if (!allowed.includes(values.desired_berth_type)) {
    errors.desired_berth_type = "Choose a berth type.";
  }
  if (!["ANY", "SAME_COACH"].includes(values.coach_scope)) {
    errors.coach_scope = "Choose a coach scope.";
  }
  return errors;
}

export function hasErrors(errors) {
  return Object.keys(errors).length > 0;
}
