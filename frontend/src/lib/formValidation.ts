import validator from 'validator';

const SQL_DANGER_PATTERN =
  /('|"|;|\-\-|\/\*|\*\/|\x00|\\x00|\\b|union|select|insert|update|delete|drop|exec|execute|<script)/i;

export function hasSqlInjectionAttempt(value: unknown): boolean {
  if (value == null || typeof value !== 'string') return false;
  const s = String(value).trim();
  if (!s) return false;
  return SQL_DANGER_PATTERN.test(s);
}

export function noSqlInjection(_: unknown, value: unknown) {
  if (hasSqlInjectionAttempt(value)) {
    return Promise.reject(new Error('Caracteres o patrones no permitidos'));
  }
  return Promise.resolve();
}

export function textRules(options: { required?: boolean; min?: number; max?: number }) {
  const rules: Array<{ required?: boolean; message?: string } | { validator: (a: unknown, v: unknown) => Promise<void> }> = [];
  if (options.required) {
    rules.push({ required: true, message: 'Campo requerido' });
  }
  if (options.min != null || options.max != null) {
    rules.push({
      validator: (_, v) => {
        if (v == null || String(v).trim() === '') return Promise.resolve();
        const s = String(v).trim();
        if (!validator.isLength(s, { min: options.min ?? 0, max: options.max ?? 1000 })) {
          const msg = options.min != null && options.max != null
            ? `Entre ${options.min} y ${options.max} caracteres`
            : options.max != null
              ? `Máximo ${options.max} caracteres`
              : `Mínimo ${options.min} caracteres`;
          return Promise.reject(new Error(msg));
        }
        return Promise.resolve();
      },
    });
  }
  rules.push({ validator: noSqlInjection });
  return rules;
}

export function emailRules(required = true) {
  const rules: Array<{ required?: boolean; message?: string } | { validator: (a: unknown, v: unknown) => Promise<void> }> = [];
  if (required) {
    rules.push({ required: true, message: 'Correo requerido' });
  }
  rules.push({
    validator: (_, v) => {
      if (v == null || String(v).trim() === '') return Promise.resolve();
      const s = String(v).trim();
      if (hasSqlInjectionAttempt(s)) return Promise.reject(new Error('Caracteres no permitidos'));
      if (!validator.isEmail(s)) return Promise.reject(new Error('Formato de correo inválido'));
      return Promise.resolve();
    },
  });
  return rules;
}

export function optionalNoSqlInjection(_: unknown, value: unknown) {
  if (value == null || String(value).trim() === '') return Promise.resolve();
  return noSqlInjection(_, value);
}
