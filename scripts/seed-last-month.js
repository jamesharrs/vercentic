const fs = require('fs');
const { randomUUID: uuidv4 } = require('crypto');

const DATA_PATH = '/Users/james/projects/talentos/data/talentos.json';
const data = JSON.parse(fs.readFileSync(DATA_PATH));

const ENV_ID    = 'c0c64e3b-113d-48b8-bc3c-684769849742';
const PEOPLE_ID = 'ee66d95d-c20b-4c58-8b17-14151a944d01';
const JOBS_ID   = 'ea9c6169-4926-472d-a51d-873f41cf181f';

const now = new Date();
const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
const lastMonthEnd   = new Date(now.getFullYear(), now.getMonth(), 0);
const randDate = () => {
  const t = lastMonthStart.getTime() + Math.random() * (lastMonthEnd.getTime() - lastMonthStart.getTime());
  return new Date(t).toISOString();
};

const firstNames = ['Alice','Ben','Chloe','David','Emma','Faisal','Grace','Hassan','Isla','James','Kara','Liam','Maya','Noah','Olivia','Priya','Ravi','Sara','Tom','Uma'];
const lastNames  = ['Smith','Jones','Khan','Lee','Patel','Brown','Davis','Wilson','Taylor','Anderson'];
const statuses   = ['Active','Active','Active','Active','Passive','Not Looking','Placed'];
const depts      = ['Engineering','Product','Sales','Marketing','Finance','Operations','HR','Legal'];
const jobTitles  = ['Senior Engineer','Product Manager','Sales Director','Marketing Lead','Finance Analyst','Operations Manager','TA Partner','Legal Counsel','Data Scientist','UX Designer'];
const jobStatuses= ['Open','Open','Open','Open','Draft','On Hold'];
const locations  = ['Dubai','London','New York','Singapore','Amsterdam'];
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

for (let i = 0; i < 20; i++) {
  const id = uuidv4(), created = randDate();
  const fn = pick(firstNames), ln = pick(lastNames), status = pick(statuses);
  data.records.push({ id, object_id: PEOPLE_ID, environment_id: ENV_ID,
    data: { first_name: fn, last_name: ln, email: `${fn.toLowerCase()}.${ln.toLowerCase()}@example.com`,
            status, department: pick(depts), location: pick(locations), person_type: 'Employee' },
    created_at: created, updated_at: created, deleted_at: null });
  data.activity.push({ id: uuidv4(), environment_id: ENV_ID, record_id: id, object_id: PEOPLE_ID,
    action: 'created', actor: 'Admin', changes: { first_name: fn, last_name: ln, status }, created_at: created });
}

for (let i = 0; i < 12; i++) {
  const id = uuidv4(), created = randDate();
  const title = pick(jobTitles), dept = pick(depts), status = pick(jobStatuses);
  data.records.push({ id, object_id: JOBS_ID, environment_id: ENV_ID,
    data: { job_title: title, department: dept, status, location: pick(locations),
            employment_type: pick(['Full-time','Contract','Part-time']),
            salary_min: 60000 + Math.round(Math.random()*40000),
            salary_max: 100000 + Math.round(Math.random()*60000) },
    created_at: created, updated_at: created, deleted_at: null });
  data.activity.push({ id: uuidv4(), environment_id: ENV_ID, record_id: id, object_id: JOBS_ID,
    action: 'created', actor: 'Admin', changes: { job_title: title, status, department: dept }, created_at: created });
}

fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
console.log('✅ Seeded 20 candidates + 12 jobs dated last month');
console.log('   People total:', data.records.filter(r => r.object_id === PEOPLE_ID && !r.deleted_at).length);
console.log('   Jobs total:  ', data.records.filter(r => r.object_id === JOBS_ID   && !r.deleted_at).length);
