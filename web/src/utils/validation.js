export const validateRequired = (value) => {
  if (value === undefined || value === null) return 'This field is required'
  if (typeof value === 'string' && value.trim() === '') return 'This field is required'
  if (Array.isArray(value) && value.length === 0) return 'Please select at least one item'
  return null
}

export const validateString = (value, minLength = 0, maxLength = null) => {
  const req = validateRequired(value)
  if (req) return req
  if (typeof value !== 'string') return 'Must be text'
  if (value.trim().length < minLength) return `Minimum ${minLength} characters required`
  if (maxLength && value.length > maxLength) return `Maximum ${maxLength} characters allowed`
  return null
}

export const validateNumber = (value, min = null, max = null) => {
  const req = validateRequired(value)
  if (req) return req
  
  const num = Number(value)
  if (isNaN(num)) return 'Must be a valid number'
  if (min !== null && num < min) return `Cannot be less than ${min}`
  if (max !== null && num > max) return `Cannot be more than ${max}`
  return null
}

export const validateEmail = (value) => {
  const req = validateRequired(value)
  if (req) return req
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(value)) return 'Please enter a valid email address'
  return null
}

/**
 * Validates a form data object against a schema
 * @param {Object} data - The form data
 * @param {Object} schema - Validation schema e.g. { name: (val) => validateRequired(val) }
 * @returns {Object} - Object containing errors (if any)
 */
export const validateForm = (data, schema) => {
  const errors = {}
  Object.keys(schema).forEach(key => {
    const error = schema[key](data[key], data)
    if (error) {
      errors[key] = error
    }
  })
  return errors
}
