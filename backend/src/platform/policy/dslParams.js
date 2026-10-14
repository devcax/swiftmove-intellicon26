/** The checks of one parameter of a requirement leaf, by the kind its check declares. Pure. Used by dsl.js. */

function err(field, message) {
  return { field, message };
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function validateParamValue(schema, value, path, errors) {
  if (value == null) {
    if (schema.required) errors.push(err(path, `parameter "${schema.name}" is required`));
    return;
  }
  switch (schema.kind) {
    case 'enum':
      if (!schema.values.includes(value)) {
        errors.push(err(path, `parameter "${schema.name}" must be one of ${schema.values.join(', ')}`));
      }
      break;
    case 'enumList':
      if (!Array.isArray(value) || value.length === 0 || value.length > 20) {
        errors.push(err(path, `parameter "${schema.name}" must be a list of 1-20 values`));
        break;
      }
      for (const item of value) {
        if (!schema.values.includes(item)) {
          errors.push(err(path, `parameter "${schema.name}" may only contain ${schema.values.join(', ')}`));
          break;
        }
      }
      break;
    case 'number': {
      const n = Number(value);
      if (!Number.isFinite(n)) {
        errors.push(err(path, `parameter "${schema.name}" must be a number`));
        break;
      }
      if (schema.min != null && n < schema.min) errors.push(err(path, `parameter "${schema.name}" must be at least ${schema.min}`));
      if (schema.max != null && n > schema.max) errors.push(err(path, `parameter "${schema.name}" must be at most ${schema.max}`));
      break;
    }
    case 'string':
      if (typeof value !== 'string' || value.trim() === '' || value.length > 200) {
        errors.push(err(path, `parameter "${schema.name}" must be a text of 1-200 characters`));
      }
      break;
    case 'boolean':
      if (typeof value !== 'boolean') errors.push(err(path, `parameter "${schema.name}" must be true or false`));
      break;
    case 'gateMap': {
      const stages = ['PICKUP', 'DELIVERY'];
      const milestones = ['LOADED', 'DELIVERED'];
      if (!isPlainObject(value) || Object.keys(value).length === 0 || Object.keys(value).length > 4) {
        errors.push(err(path, `parameter "${schema.name}" must map 1-4 milestones to stages`));
        break;
      }
      for (const [milestone, stage] of Object.entries(value)) {
        if (!milestones.includes(milestone)) {
          errors.push(err(path, `parameter "${schema.name}" can only gate: ${milestones.join(', ')}`));
        }
        if (!stages.includes(stage)) {
          errors.push(err(path, `parameter "${schema.name}" stages must be ${stages.join(' or ')}`));
        }
      }
      break;
    }
    default:
      errors.push(err(path, `parameter "${schema.name}" has an unknown kind "${schema.kind}"`));
  }
}

module.exports = { err, isPlainObject, validateParamValue };
