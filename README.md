# Grin API

This service is the API used to register and authenticate users, in addition to giving information about their nearest places of interest and their favorites.

There is [collection](https://www.getpostman.com/collections/f79cfc8f378cf689bcdb) in [Postman](https://www.getpostman.com/) with all the information related to the endpoints exposed by this API, also we you run the server, the servve expose in its base path: [/](http://localhost:3000) a UI  with an implemantation of [Swagger](https://swagger.io/), where you can call all the endpoints.

- [Grin API](#grin-api)
- [Stack of technologies used](#stack-of-technologies-used)
- [Some questions](#some-questions)
	- [Why Google Places API?](#why-google-places-api)
	- [Why I used for pagination:](#why-i-used-for-pagination)
	- [Why I use JWT:](#why-i-use-jwt)
	- [Why I use bcrypt to hash and compare password:](#why-i-use-bcrypt-to-hash-and-compare-password)
- [How to Run](#how-to-run)
	- [with Docker](#with-docker)
		- [Available Containers](#available-containers)
		- [Advantages](#advantages)
	- [with Gulp](#with-gulp)
		- [Tasks](#tasks)
		- [Advantages](#advantages-1)

# Stack of technologies used

- [Node.js](https://nodejs.org/): JavaScript runtime built on Chrome's V8 JavaScript engine, used to run the server.
- [Hapi.js](https://hapijs.com/): Node.js framework used  to buid application and services, with this we build our server that attend request for users, search and favorite places.
- [Mongo](https://www.mongodb.com/): NoSQL Database data that stores data in flexible, JSON-like document, I use it to save all data about users and places.
- [Redis](https://redis.io/): Redis is a in-memory data structure store, that has multiple use cases, but I used as a cache, to store all the users sessions and requests.
- [jwt](https://jwt.io/introduction/): it's an standard that defines a way for securely transmitting information between parties as a JSON object, in this project we used to validate incoming requests from our users.
- [Jest](https://jestjs.io/): Javascript test framework for Node.js and the browser, I use it to build all of the integration tests.
- [Google Places API](https://developers.google.com/places/web-service/search): An API owned by Google that allow us to query for place information. I used to search for places by query and proximity.

# Some questions

## Why Google Places API?

I made research about some a lot of services/API that offers information about places, a define their pros and cons, these are the services/API that we found:

- [Forsquare](https://developer.foursquare.com/places-api):
  - Pros:
    - Has pagination
    - Has distance from the user
    - Has limit of distance between the user and the places
  - Cons
    - Does not have sorting
    - A lot of unnecesary information of a places

- [Google Places API](https://developers.google.com/places/web-service/search):
  - Pros:
    - Search by text string
    - Has sort by popularity(prominence) and by distance
    - We can choose the fields that we want
    - A lot of places in his database, and types of places
    - Clear documenation
  - Cons:
    - Does not have distance between the user and the places
    - Doest not have limit of places that we want
- [Here](https://developer.here.com/documentation/places/):
  - Pros:
    - Simple to use
    - We can query for text string
  - Cons:
    - Has less places than the other services
    - Does not have pagination
    - Does not have opotion to limit how many places we want

After that, I decide to use Google Places because even that we don't have pagination we can made it in our side, but we have a lot of flexibility to filter places and quick responses, and its documentation is clear.

## Why I used for pagination:

I use a plugin for Hapi called [hapi-pagination](https://github.com/fknop/hapi-pagination), but I found some limitations with this library, so I decided to fork it and made the changes that works with my use case, this is the final plugin: [yoelfme/hapi-pagination](https://github.com/yoelfme/hapi-pagination), I made the changes with its tests and with that still persists the 100% of coverage :sunglasses: that the plugin had.

## Why I use JWT:

Because I think that its implemantation is too easy, and even so we have strong security.

## Why I use bcrypt to hash and compare password:

Because it's a good way to prevent our passwords from being stolen or revealed, and compare passwords with bcrypt help us to prevent [timing attack](https://en.wikipedia.org/wiki/Timing_attack) when the users made login.


# How to Run

There are 2 ways to run the project locally, it could be with [Docker](#with-docker) or with [Gulp](#with-gulp)

## with Docker

To run the project using Docker, you have to follow the next steps:

1) Install [Docker](https://docs.docker.com/install/) and [docker-compose](https://docs.docker.com/compose/install/)
2) Copy the example file with environments variables to a new file call `.env.docker`:
```shell
cp .env.example .env.docker
```
3) Change the following environments variables:
	- **GOOGLE_MAPS_API_KEY**: Set your secret key provided by Google Maps
	- **REDIS_HOST**: Set to `redis`
	- **APP_DB_HOST**: Set to `mongo`
4) Buid the image locally: `docker-compose build`
5) Start to run the containers: `docker-compose up`, but if you want to run it in background, add the flag `-d`
6) Visit [localhost:3000](http://localhost:3000) 

### Available Containers

The availables containers are:

- **api**: a container with a [Node.js](https://nodejs.org/) image, that run our Hapi Server
- **redis**: a container used to manage the session users and cache data
- **mongo**: a container used to store all the data related to users and places.

### Advantages

- Running it this way is the closest thing to running it in production

## with Gulp

To run the project using Gulp, you have to follow the next steps, but first you need to install [Redis](https://redis.io/topics/quickstart) and [Mongo](https://docs.mongodb.com/manual/installation/)(also you can use Docker :tonge:), and expose their ports locally.

1) Install [npx](https://github.com/zkat/npx)
2) Install [nvm](https://github.com/creationix/nvm), a package used to manage multiple node.js versions
3) Install the Node.js with nvm, run `nvm install` in the project root directory
4) Copy the example file with environments variables to a new file call `.env`:
```shell
cp .env.example .env
```
5) Change the following environments variables:
	- **GOOGLE_MAPS_API_KEY**: Set your secret key provided by Google Maps
6) Install all the dependencies running: `npm i`
7) Run the server with: `npx gulp serve`
8) Visit [localhost:3000](http://localhost:3000) 
  
### Tasks
- `serve`: used to run the server locally, run it with: `npx gulp serve`
- `test`: used to run all the test cases locally, run it with: `npx gulp test`

### Advantages

- running in this way, because we use [nodemon](https://github.com/remy/nodemon) with Gulp, we can make changes and see them in real time.



---

Created with :heart: by [Yoel Monzon](https://www.github.com/yoelfme/)
