// BAD: uses fetch without require — no-undef in non-Node18 context... 
// Actually let's use a genuinely undefined thing
const router = require('express').Router();

router.get('/', async (req, res) => {
  // no-undef: TOTALLY_UNDEFINED is not declared anywhere
  const x = TOTALLY_UNDEFINED_GLOBAL_VAR;
  res.json(x);
});

module.exports = router;
