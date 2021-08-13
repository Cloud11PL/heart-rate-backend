# Create app directory

FROM node:14.15.4

# WORKDIR /usr/src/app
WORKDIR /nodeapp

# Install app dependencies

# COPY package*.json ./
ADD ./package.json /nodeapp/package.json

RUN npm install

# ADD ./app /nodeapp/app

# If you are building your code for production

# RUN npm ci --only=production

# Bundle app source

COPY . .

EXPOSE 8080

ENV NODE_ENV=development

RUN npm install -g nodemon

# CMD [ "node", "." ]
# CMD [ "nodemon", "-L", "index.js" ]
# CMD [ "npm", "start" ]