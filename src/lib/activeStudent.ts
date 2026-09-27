export type ActiveStudent = {
  login: string;
  name: string;
  isTeacher: boolean;
};

let current: ActiveStudent | null = null;

export const activeStudent = {
  set: (value: ActiveStudent) => {
    current = value;
  },
  get: () => current,
  clear: () => {
    current = null;
  },
};
