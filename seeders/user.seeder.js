import { faker } from "@faker-js/faker";
import User from "../models/user.model.js";

const createUser = async (numUsers) => {
  try {
    const usersPromise = [];

    for (let i = 0; i < numUsers; i++) {
      const tempUser = User.create({
        name: faker.person.fullName(),
        username: faker.internet.userName(),
        bio: faker.lorem.sentence(10),
        password: "12345",
        avatar: {
          url: faker.image.avatar(),
          public_id: faker.system.fileName(),
        },
      });
      usersPromise.push(tempUser);
    }
    await Promise.all(usersPromise);

    console.log("users created: ", numUsers);
    process.exit(1);
  } catch (err) {
    console.log(err);
  }
};



export {createUser };
