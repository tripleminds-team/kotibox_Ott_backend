require('dotenv').config();
const mongoose = require('mongoose');

async function queryMovie() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');

  const Movie = mongoose.model('Movie', new mongoose.Schema({}, { strict: false }));
  
  const movie = await Movie.findById('6a3387222e358a4c3decdb45');
  console.log('Movie:', movie);

  await mongoose.disconnect();
}

queryMovie().catch(console.error);
