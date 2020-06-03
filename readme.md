#  Meet Anzu

Anzu is our greatest endeavor to build the most rad, simple & reactive forum software out there since the Javascript revolution.

Forum platforms to host communities are vast. Many would say it's a lifeless space with almost zero innovation, and attempting to create something new is pointless. We dissent, and if you found this repository you might also share with us the idea that there has to be an alternative to the old forum. Well, we think Anzu is that young and sexy software that could bring back to life the community-building movement.

This repository contains the front-end repository.

We're still working in the first alpha, so previous knowledge about the stack is required to set things up.

##  Anzu's stack
-  Golang.
-  Redis (to be replaced)
-  BuntDB (embedded cache)
-  MongoDB (DB)
-  React JS (with a heavy use of hooks)

##  Installation

###  Download dependencies
The first step is to download and install Go, official binary distributions are available at [https://golang.org/dl/](https://golang.org/dl/).

Download and configure **MongoDB** and **Redis** (you'll need to create a root user in MongoDB). Alternatively you can use remote servers.

###  Download the repositories

Download the [core](http://github.com/tryanzu/anzu) in any path.

Initialize the repo submodule, so the [frontend](http://github.com/tryanzu/frontend) is in `static/frontend`.

```
git submodule update --init --recursive
```

Install andn build the core dependencies with `go build -o anzu`. A binary named anzu will be created and it is the program we'll run to create an anzu forum.

Now go to the frontend folder in `static/frontend`, install the frontend dependencies with `npm install` and finally compile the frontend with `npm run build`.

###  Configure
Copy the `.env.example` file into `.env` and edit it to meet your local environment configuration. Environment config can be setup either using OS env vars or .env file. This config is read at anzu boot time and it is core to be able to run the program.

Copy the `config.toml.example` file into `config.toml` and edit it to meet your site configuration.

###  Last steps
Having mongodb & redis running and everything set up in .env we can now start the program.

Execute `./anzu` and have fun.

##  Commits

We follow the [Conventional Commits](https://www.conventionalcommits.org) specification, which help us with automatic semantic versioning and CHANGELOG generation.