# Devvit (Reddit for Developers) — local reference

> Snapshot of the **non-game** parts of <https://developers.reddit.com/docs> as of 2026-05-12, fetched via Playwright (developers.reddit.com is blocked from WebFetch). HTML→text conversion is lossy — for exact API signatures cross-check `node_modules/@devvit/*/*.d.ts`. Games docs intentionally excluded.

## Index

- **Introduction**
  - [docs](https://developers.reddit.com/docs/)
  - [intro-mod-tools](https://developers.reddit.com/docs/introduction/intro-mod-tools)
  - [quickstart-mod-tool](https://developers.reddit.com/docs/quickstart/quickstart-mod-tool)
- **Devvit Web (devvit.json + routing)**
  - [devvit_web_overview](https://developers.reddit.com/docs/capabilities/devvit-web/devvit_web_overview)
  - [devvit_web_configuration](https://developers.reddit.com/docs/capabilities/devvit-web/devvit_web_configuration)
- **Server capabilities**
  - [overview](https://developers.reddit.com/docs/capabilities/server/overview)
  - [triggers](https://developers.reddit.com/docs/capabilities/server/triggers)
  - [scheduler](https://developers.reddit.com/docs/capabilities/server/scheduler)
  - [redis](https://developers.reddit.com/docs/capabilities/server/redis)
  - [reddit-api](https://developers.reddit.com/docs/capabilities/server/reddit-api)
  - [userActions](https://developers.reddit.com/docs/capabilities/server/userActions)
  - [cache-helper](https://developers.reddit.com/docs/capabilities/server/cache-helper)
  - [post-data](https://developers.reddit.com/docs/capabilities/server/post-data)
  - [http-fetch](https://developers.reddit.com/docs/capabilities/server/http-fetch)
  - [http-fetch-policy](https://developers.reddit.com/docs/capabilities/server/http-fetch-policy)
  - [settings-and-secrets](https://developers.reddit.com/docs/capabilities/server/settings-and-secrets)
  - [media-uploads](https://developers.reddit.com/docs/capabilities/server/media-uploads)
  - [text_fallback](https://developers.reddit.com/docs/capabilities/server/text_fallback)
- **Launch screen & entry points**
  - [launch_overview](https://developers.reddit.com/docs/capabilities/server/launch_screen_and_entry_points/launch_overview)
  - [launch_screen_customization](https://developers.reddit.com/docs/capabilities/server/launch_screen_and_entry_points/launch_screen_customization)
  - [view_modes_entry_points](https://developers.reddit.com/docs/capabilities/server/launch_screen_and_entry_points/view_modes_entry_points)
- **Client capabilities (UI)**
  - [overview](https://developers.reddit.com/docs/capabilities/client/overview)
  - [forms](https://developers.reddit.com/docs/capabilities/client/forms)
  - [menu-actions](https://developers.reddit.com/docs/capabilities/client/menu-actions)
  - [navigation](https://developers.reddit.com/docs/capabilities/client/navigation)
  - [toasts](https://developers.reddit.com/docs/capabilities/client/toasts)
  - [creating_custom_post](https://developers.reddit.com/docs/capabilities/creating_custom_post)
- **Realtime**
  - [overview](https://developers.reddit.com/docs/capabilities/realtime/overview)
- **Devvit Rules (publishing policy)**
  - [devvit_rules](https://developers.reddit.com/docs/devvit_rules)
- **Guides — best practices / launch / faq / ai**
  - [mod_resources](https://developers.reddit.com/docs/guides/best-practices/mod_resources)
  - [launch-guide](https://developers.reddit.com/docs/guides/launch/launch-guide)
  - [feature-guide](https://developers.reddit.com/docs/guides/launch/feature-guide)
  - [faq](https://developers.reddit.com/docs/guides/faq)
  - [ai](https://developers.reddit.com/docs/guides/ai)
- **Guides — dev tools**
  - [devvit_cli](https://developers.reddit.com/docs/guides/tools/devvit_cli)
  - [playtest](https://developers.reddit.com/docs/guides/tools/playtest)
  - [logs](https://developers.reddit.com/docs/guides/tools/logs)
  - [devvit_test](https://developers.reddit.com/docs/guides/tools/devvit_test)
  - [ui_simulator](https://developers.reddit.com/docs/guides/tools/ui_simulator)
  - [vite](https://developers.reddit.com/docs/guides/tools/vite)
  - [multiple_developers](https://developers.reddit.com/docs/guides/tools/multiple_developers)
- **Guides — migration**
  - [devvit-web-experimental](https://developers.reddit.com/docs/guides/migrate/devvit-web-experimental)
  - [devvit-singleton](https://developers.reddit.com/docs/guides/migrate/devvit-singleton)
  - [inline-web-view](https://developers.reddit.com/docs/guides/migrate/inline-web-view)
  - [public-api](https://developers.reddit.com/docs/guides/migrate/public-api)
- **Earn money — payments**
  - [payments_overview](https://developers.reddit.com/docs/earn-money/payments/payments_overview)
  - [payments_add](https://developers.reddit.com/docs/earn-money/payments/payments_add)
  - [payments_test](https://developers.reddit.com/docs/earn-money/payments/payments_test)
  - [payments_publish](https://developers.reddit.com/docs/earn-money/payments/payments_publish)
  - [payments_manage](https://developers.reddit.com/docs/earn-money/payments/payments_manage)
  - [support_this_app](https://developers.reddit.com/docs/earn-money/payments/support_this_app)
- **Reddit API reference (selected — full classes available at /docs/api/redditapi/*; verify against @devvit/reddit .d.ts too)**
  - [RedditAPIClient](https://developers.reddit.com/docs/api/redditapi/RedditAPIClient/classes/RedditAPIClient)
  - [Post](https://developers.reddit.com/docs/api/redditapi/models/classes/Post)
  - [Comment](https://developers.reddit.com/docs/api/redditapi/models/classes/Comment)
  - [Subreddit](https://developers.reddit.com/docs/api/redditapi/models/classes/Subreddit)
  - [ModMailService](https://developers.reddit.com/docs/api/redditapi/models/classes/ModMailService)
  - [Listing](https://developers.reddit.com/docs/api/redditapi/models/classes/Listing)
  - [User](https://developers.reddit.com/docs/api/redditapi/models/classes/User)



================================================================================
# Introduction
================================================================================



<!-- ============ /docs/ ============ -->

> source: https://developers.reddit.com/docs/

- 
- Welcome to Devvit

# Devvit: Reddit's Developer Platform

Devvit allows you to build interactive games and apps that live on Reddit. Build experiences that can earn up to $167,000 per app with our Reddit Developer Funds.Build community games like Hot and Cold, Sword and Supper, and Honk, or create custom mod tools to empower your community.More examples: App ShowcaseQuestions? Join r/devvit or our Discord.

## Build Games

## Create Mod Tools


<!-- ============ /docs/introduction/intro-mod-tools ============ -->

> source: https://developers.reddit.com/docs/introduction/intro-mod-tools

- 
- Build Mod Tools
- Introduction to Mod Tools

# Mod Tools on Reddit

Empower your community and streamline moderation with custom tools built on Devvit’s powerful platform.

Devvit is Reddit’s developer platform for building interactive, cross-platform tools and apps that run natively on Reddit.

## Why build mod tools on Reddit?

Moderators can install an app on their subreddits to customize a community with bespoke mod tools, discussion bots, new governance tools, leaderboards, and more.

- Automate repetitive moderation tasks

- Improve community safety and engagement

- Streamline mod workflows

## Get started

## Quickstart

## Mod Resources

## Community

Have questions or want to share your tool? Join r/devvit or our Discord to connect with other developers, get feedback, and show off your creations.


<!-- ============ /docs/quickstart/quickstart-mod-tool ============ -->

> source: https://developers.reddit.com/docs/quickstart/quickstart-mod-tool

- 
- Build Mod Tools
- Quickstart for Mod Tools

# Mod tool quickstart

Devvit allows you to build Mod Tools - subreddit-installed applications that help moderators of that community to take action on conversations, keeping their communities safe and engaged.

This tutorial should take about 10 minutes to complete. Once complete, you'll be able to run a version of Comment Mop in your test subreddit from your own codebase.

## What you'll need

- Node.JS (version 22.2.0+)

- A code editor

## Environment setup

- Install Node.JS and NPM (instructions)

- Go to https://developers.reddit.com/new and choose Mod Tool under Other templates.

- Go through the wizard. You will need to create a Reddit account and connect it to Reddit developers.

- Follow the instructions on your terminal.

On success, you should see something like this:

```
Your Devvit authentication token has been saved to /Users/user.name/.devvit/tokenFetching and extracting the template...Cutting the template to the target directory... 🔧 Installing dependencies... 🚀🚀🚀 Devvit app successfully initialized!┌────────────────────────────────────────────────────┐│ • `cd my-app` to open your project directory ││ • `npm run dev` to develop in your test community │└────────────────────────────────────────────────────┘
```

## Understanding the template

This tutorial lets you build your own version of Comment Mop. This tool allows moderators to remove and/or lock a full comment tree with a single menu action, avoiding repetitive mechanical tasks for community moderators.

### Declare a menu action for moderators

Menu items are declared in `devvit.json`. Each entry points at a server endpoint that runs when a moderator clicks it. The template leverages Menu Actions to enable moderators to Delete/Lock child comments of a post or comment.

devvit.json

```
{ "menu": { "items": [ { "label": "Mop comments", "description": "Remove this comment and all child comments. This might take a few seconds to run.", "forUserType": "moderator", "location": ["comment"], "endpoint": "/internal/menu/mop-comments" } ] }, "forms": { "mopForm": "/internal/form/mop-submit" }, "permissions": { "reddit": { "enable": true, "scope": "moderator" } }}
```

### Show a form from the menu action

Some moderator tools need additional information before they execute. The menu endpoint can respond with a form using menu responses. Comment Mop displays a form with options for the action to be taken:

server/index.ts

```
import type { MenuItemRequest, UiResponse } from '@devvit/web/shared';app.post('/internal/menu/mop-comments', async (c) => { const _input = await c.req.json(); return c.json({ showForm: { name: 'mopForm', form: { title: 'Mop Comments', acceptLabel: 'Mop', cancelLabel: 'Cancel', fields: [ { name: 'remove', label: 'Remove comments', type: 'boolean', defaultValue: true }, { name: 'lock', label: 'Lock comments', type: 'boolean', defaultValue: false }, { name: 'skipDistinguished', label: 'Skip distinguished comments', type: 'boolean', defaultValue: false, }, ], }, }, });});
```

### Handle the form submission with the Reddit API

Devvit apps can use the Reddit API to act on comments and posts. The form submission endpoint receives the moderator's selections and traverses the comment tree:

server/index.ts

```
import { reddit, context } from '@devvit/web/server';import type { UiResponse } from '@devvit/web/shared';type MopFormRequest = { remove: boolean; lock: boolean; skipDistinguished: boolean;};app.post('/internal/form/mop-submit', async (c) => { const { remove, lock, skipDistinguished } = await c.req.json(); const { commentId } = context; if (!remove && !lock) { return c.json({ showToast: 'You must select either lock or remove.' }); } if (!commentId) { return c.json({ showToast: 'This action must be run on a comment.' }); } try { const rootComment = await reddit.getCommentById(commentId); for await (const comment of walkReplies(rootComment, skipDistinguished)) { if (remove && !comment.removed) await comment.remove(); if (lock && !comment.locked) await comment.lock(); } return c.json({ showToast: 'Comments mopped! Refresh the page to see the cleanup.', }); } catch (err) { console.error(err); return c.json({ showToast: 'Mop failed! Please try again later.' }); }});async function* walkReplies( comment: Awaited>, skipDistinguished: boolean,): AsyncGenerator { if (skipDistinguished && comment.distinguishedBy) return; yield comment; const replies = await comment.replies.all(); for (const reply of replies) { yield* walkReplies(reply, skipDistinguished); }}
```

## Building and Testing

To build and run your Mod tool, run the following commands on terminal:

```
npm run dev
```

If you didn't provide a test subreddit, one will be created for you. Once you run `npm run dev`, you will receive a link to test the mod tool in your test subreddit.

Note that this mod tool is intended to be run on comments, so you will need to create a post and comment in your subreddit to see it.

## Result

Now you have a mod tool running from the code that you deployed yourself. Feel free to experiment with the code and run `npm run dev` again to see the changes. Notice that you don't need to worry about running costs for your mod tool, because Reddit hosts all Devvit applications for free. Also, if your mod tool becomes popular and gets installed by many subreddits, you may become eligible to earn Reddit Developer Funds.

## Further reading

- Use our launch guide to guide you where to get your first users.

- Devvit Forms

- Menu Actions

- Reddit Developer Funds


================================================================================
# Devvit Web (devvit.json + routing)
================================================================================



<!-- ============ /docs/capabilities/devvit-web/devvit_web_overview ============ -->

> source: https://developers.reddit.com/docs/capabilities/devvit-web/devvit_web_overview

- 
- Devvit Technical Overview

# Devvit Web

Devvit Web includes an easy way to build Devvit apps using a standard web stack.

## What it is

Devvit Web allows developers to build Devvit apps just like you would for the web. At the core, Devvit Web provides:

- A standard web app that allows you to build with industry-standard frameworks and technologies (like React, Three.js, or Phaser).

- Server endpoints that you define to communicate between the webview client and the Devvit server, using industry-standard frameworks and technologies (like Express.js, Hono, Koa, etc.).

- Devvit configuration with a traditional client/server split. Devvit capabilities are now in one of three places:

- A configuration file in devvit.json for defining app metadata, permissions, and capabilities

- Client capabilities in the @devvit/client SDK

- Server capabilities, like Redis and Reddit API with the @devvit/server SDK

With Devvit Web, you have continued access to our hosting services, key capabilities like Redis and Reddit API, standard web technologies, and a typical client/server pattern to build your apps.

In addition, since you’re working with standard web technologies your apps should work with AI tools more effectively.

## Examples

Visit https://developers.reddit.com/new and choose one of our templates or take a look at the github repositories:

- React

- Phaser

- Three.js

- Hello World

## Limitations

As with most experimental features, there are some caveats.

LimitationWhat it meansServerless endpointsThe node server will run just long enough to execute your endpoint function and return a response, which means you can't use packages that require long-running connections like streaming.Package limitationsDevelopers cannot use `fs` or external native packages. For now, we recommend using external services over the native dependencies, such as StreamPot (instead of ffmpeg) and OpenAI (instead of @xenova/transformers) .Single request and single response handling onlyStreaming or chunked responses and websockets are not supported. Long-polling is supported if it's under the max request time.No external requests from your clientYou can't have any external requests other than the app's webview domain. All backend responses are locked down to the webview domain via CSP. (Your backend can make external fetch requests though.)localStorage clears on app updatesThe iframe URL changes with each app version, so `localStorage` data is lost when you publish an update. Use Redis for data that needs to persist across app versions.

Devvit Web still has the same technical requirements:

- Server endpoint calls

- Max request time: 30s

- Max payload size: 4MB

- Max response size: 10MB

- HTML/CSS/JS only

## Devvit Web components

Devvit Web uses endpoints between the client and server to make communication similar to standard web apps. A Devvit Web app has three components:

- Client

- Server

- Configuration

Devvit Web templates all have the same file structure:

```
.├── src/│ ├── client/ # contains the webview code│ └── server/ # endpoints for the client└── devvit.json # the devvit config file
```

Your client talks to the server by calling `/api/` endpoints you define with `fetch()`.

### Client folder

This folder includes client-side code. This includes any html/css/javascript and relevant web libraries, and it will appear in a webview inside of a post for Reddit users.

When you want to make server-side calls, or use server-side capabilities, you’ll use fetch and define what happens in your server folder.

### Server folder

This folder includes server-side code. We provide a node server, and you can use typical node server frameworks like Hono, Koa, or Express. This is where you can access key capabilities like Redis, Reddit API client, and fetch.

We also provide an authentication middleware so you don’t have to worry about authentication.

note
All server endpoints must start with `/api/` (e.g. `/api/get-something` or `/api/widgets/42`).

### Configuration in devvit.json

`devvit.json` is the configuration file for Devvit apps. It defines an app's post configuration, Node.js server configuration, permissions, scheduled jobs, event triggers, menu entries, payments configuration, and project settings. `devvit.json` replaces the legacy `devvit.yaml` configuration. A project should have one or the other but not both.

Learn more about devvit.json


<!-- ============ /docs/capabilities/devvit-web/devvit_web_configuration ============ -->

> source: https://developers.reddit.com/docs/capabilities/devvit-web/devvit_web_configuration

- 
- Devvit Setup Overview
- Devvit Configuration

# Configure your app

The devvit.json file serves as your app's configuration file. Use it to specify entry points, configure features like event triggers and scheduled actions, and enable app functionality such as image uploads. This page covers all available devvit.json configuration options. A complete devvit.json example file is provided here.

## devvit.json

The `devvit.json` schema is available and is self-documented.

All configuration files should include a `$schema` property which many IDEs will use to make suggestions and present documentation:

```
{ "$schema": "https://developers.reddit.com/schema/config-file.v1.json"}
```

## Required properties

Your `devvit.json` must include:

- `name` (required): App account name and Community URL slug. Must be 3-16 characters, start with a letter, and contain only lowercase letters, numbers, and hyphens.

Additionally, you must include at least one of:

- `post`: For web view apps

- `server`: For Node.js server apps

## Configuration sections

### Core properties

PropertyTypeDescriptionRequired`name`stringApp account name and Community URL slug (3-16 chars, `^[a-z][a-z0-9-]*$`)Yes`$schema`stringSchema version for IDE supportNo (recommended)

### App components

PropertyTypeDescriptionRequired`post`objectCustom post/web view configurationOne of post/server`server`objectNode.js server configurationOne of post/server

### Permissions & capabilities

PropertyTypeDescriptionRequired`permissions`objectWhat your app is allowed to doNo`media`objectStatic asset configurationNo`marketingAssets`objectAssets for featuring your appNo

### Event handling

PropertyTypeDescriptionRequired`triggers`objectEvent trigger endpointsNo (requires server)`scheduler`objectScheduled task configurationNo

### UI & interaction

PropertyTypeDescriptionRequired`menu`objectMenu items in posts, comments, subredditsNo`forms`objectForm submission endpointsNo

### Development

PropertyTypeDescriptionRequired`dev`objectDevelopment configurationNo`scripts`objectBuild commands run by the Devvit CLI (optional)No

## Detailed configuration

### Post configuration

Configure web views for custom post types:

```
{ "post": { "dir": "public", "entrypoints": { "default": { "entry": "index.html", "height": "tall" } } }}
```

Properties:

- `dir` (string): Client directory for web view assets (default: `"public"`)

- `entrypoints` (object): Map of named entrypoints for post rendering

- Must include a `"default"` entrypoint

- `entry` (string): HTML file path or `/api/` endpoint

- `height` (enum): `"regular"` or `"tall"` (default: `"regular"`)

### Server configuration

Configure Node.js server functionality:

```
{ "server": { "entry": "src/server/index.js" }}
```

Properties:

- `entry` (string): Server bundle filename (default: `"src/server/index.js"`)

Server bundles must be compiled to CommonJS (`cjs`). ES module output is not supported by the Devvit Web runtime.

### Permissions configuration

Control what your app can access:

```
{ "permissions": { "http": { "enable": true, "domains": ["example.com", "api.github.com"] }, "media": true, "payments": false, "realtime": false, "redis": true, "reddit": { "enable": true, "asUser": ["SUBMIT_POST", "SUBMIT_COMMENT"] } }}
```

HTTP plugin:

- `enable` (boolean): Enable HTTP plugin (default: `true`)

- `domains` (array): Allowed domains for `fetch()` calls

Reddit API plugin:

- `enable` (boolean): Enable Reddit API (default: `true`)

- `scope` (enum): `"user"` or `"moderator"` (default: `"user"`)

- `asUser` (array): APIs to execute as user account

Other permissions:

- `media` (boolean): Enable media uploads (default: `false`)

- `payments` (boolean): Enable payments plugin (default: `false`)

- `realtime` (boolean): Enable realtime messaging (default: `false`)

- `redis` (boolean): Enable Redis storage (default: `false`)

### Triggers configuration

Handle Reddit events:

```
{ "triggers": { "onPostCreate": "/internal/triggers/post-create", "onCommentSubmit": "/internal/triggers/comment-submit", "onModAction": "/internal/triggers/mod-action" }}
```

Available triggers:

- `onAppInstall`, `onAppUpgrade`

- `onPostCreate`, `onPostDelete`, `onPostSubmit`, `onPostUpdate`, `onPostReport`, `onPostFlairUpdate`, `onPostNsfwUpdate`, `onPostSpoilerUpdate`

- `onCommentCreate`, `onCommentDelete`, `onCommentSubmit`, `onCommentUpdate`, `onCommentReport`

- `onModAction`, `onModMail`

- `onAutomoderatorFilterPost`, `onAutomoderatorFilterComment`

Note: All trigger endpoints must start with `/internal/` and will receive POST requests with JSON data.

### Menu configuration

Add menu items to subreddit interfaces:

```
{ "menu": { "items": [ { "label": "Approve Post", "description": "Quickly approve this post", "forUserType": "moderator", "location": ["post"], "endpoint": "/internal/menu/approve-post", "postFilter": "none" }, { "label": "Report Issue", "description": "Report a problem with this post", "forUserType": "user", "location": ["post", "comment"], "endpoint": "/internal/menu/report-issue" } ] }}
```

Menu item properties:

- `label` (string): Display text (required)

- `description` (string): Short description

- `forUserType` (enum): `"moderator"` or `"user"` (default: `"moderator"`)

- `location` (string|array): Where menu appears (`"post"`, `"comment"`, `"subreddit"`)

- `endpoint` (string): Internal endpoint to call (required)

- `postFilter` (enum): `"none"` or `"currentApp"` (default: `"none"`)

### Scheduler configuration

Configure scheduled tasks:

```
{ "scheduler": { "tasks": { "daily-cleanup": { "endpoint": "/internal/cron/daily-cleanup", "cron": "0 2 * * *" }, "hourly-check": { "endpoint": "/internal/cron/hourly-check", "cron": "0 * * * *", "data": { "checkType": "health" } }, "manual-task": "/internal/cron/manual-task" } }}
```

Task configuration:

- `endpoint` (string): Internal endpoint to call (required)

- `cron` (string): Cron schedule (optional, for automatic scheduling)

- `data` (object): Additional data passed to cron tasks (optional)

Cron format: Standard five-part (`0 2 * * *`) or six-part (`*/30 * * * * *`) format.

### Forms configuration

Map form identifiers to submission endpoints:

```
{ "forms": { "contact_form": "/internal/forms/contact", "feedback_form": "/internal/forms/feedback" }}
```

### Marketing assets

Configure app presentation:

```
{ "marketingAssets": { "icon": "assets/icon.png" }}
```

Properties:

- `icon` (string): Path to 1024x1024 PNG icon (required)

### Scripts configuration

Configure build commands run by the Devvit CLI. These commands run relative to the `devvit.json` directory.

```
{ "scripts": { "dev": "vite build --watch", "build": "vite build" }}
```

Properties:

- `dev` (string): Command run by `devvit playtest` to build or watch your client/server artifacts

- `build` (string): Command run by `devvit upload` to build your client/server artifacts

### Development configuration

Configure development settings:

```
{ "dev": { "subreddit": "my-test-subreddit" }}
```

Properties:

- `subreddit` (string): Default development subreddit (can be overridden by `DEVVIT_SUBREDDIT` env var)

## Validation rules

The `devvit.json` configuration is validated against the JSON Schema at build time. Many IDEs will also underline errors as you write. Common validation errors include:

- JSON Syntax: Adding comments or trailing commas (unsupported by JSON)

- Required Properties: Missing the required `name` property

- App Components: Missing at least one of `post` or `server`

- Dependencies: Missing `server` when `triggers` is specified

- File References: Missing files referenced in `devvit.json`

- Permissions: Missing required permissions for used features

- Pattern Validation: Invalid patterns for names, paths, or endpoints

## Best practices

- Always include the `$schema` property for IDE autocompletion and validation.

- Use specific permission scopes. Only request permissions your app actually uses.

- Set appropriate menu scopes. Consider whether features should be available to all users or just moderators.

- Validate endpoints. Ensure all internal endpoints start with `/internal/`.

- Use meaningful names. Choose descriptive names for entrypoints, tasks, and forms.

- Test configurations. Validate your config with `devvit build` before deployment.

## Environment variables

- `DEVVIT_SUBREDDIT`: Override the `dev.subreddit` value used during `devvit playtest`.

- `DEVVIT_APP_NAME`: Override the `name` value used during `devvit playtest` (and other similar commands).

## Complete example

devvit.json

```
{ "$schema": "https://developers.reddit.com/schema/config-file.v1.json", "name": "my-awesome-app", "post": { "dir": "public", "entrypoints": { "default": { "entry": "index.html", "height": "tall" } } }, "server": { "entry": "src/server/index.js" }, "permissions": { "http": { "enable": true, "domains": ["api.example.com"] }, "redis": true }, "triggers": { "onPostCreate": "/internal/triggers/post-create" }, "menu": { "items": [ { "label": "Approve", "forUserType": "moderator", "location": "post", "endpoint": "/internal/menu/approve" } ] }, "scheduler": { "tasks": { "daily-cleanup": { "endpoint": "/internal/cron/cleanup", "cron": "0 2 * * *" } } }, "marketingAssets": { "icon": "assets/icon.png" }, "dev": { "subreddit": "my-test-sub" }, "scripts": { "dev": "vite build --watch", "build": "vite build" }}
```


================================================================================
# Server capabilities
================================================================================



<!-- ============ /docs/capabilities/server/overview ============ -->

> source: https://developers.reddit.com/docs/capabilities/server/overview

- 
- Devvit Setup Overview
- Server Overview

# Server Overview

Devvit offers a wide variety of features that help you integrate your app with Reddit's APIs, scale your app free of charge using Reddit's backend, and more. The features in this section are executed on the server side. They can be imported in Devvit Web applications, as well as Mod Tools.

Below is a brief explanation of all features in this section:

## HTTP fetch

Allows you to make HTTP requests to external servers, subject to a review of the specific domains you are requesting from.

## Media uploads

Allows you to build apps where the end user can upload custom images to Reddit's CDN. Uploaded media is subject to the same safety checks as every other media content uploaded to Reddit, ensuring community safety.

## Reddit API

Allows you to query information from Reddit such as comments, posts and upvotes. Limited to installation scope of the application.

## Data storage (Redis)

Allows you to store app data in a key-value database, free of charge. Limited to the installation scope of the application.

## Scheduler

Allows you to run automated server-side tasks on a schedule, for example, checking for updates every hour.

## Secrets storage

Allows you to build an app where the moderator can store secret keys in a safe and scalable way. For example, if your app needs the installing moderator to provide their own keys to an external API.

## Triggers

Allows you to run automated server-side tasks when certain events happen on Reddit, for example: when a new post is created, or when a new comment is created.

## User actions

Allows you to execute some actions, like posting or commenting, on behalf of the user. This means that these new posts or comments will not show up as created by the app, but by the user that is currently using the app. Access to this feature is subject to review by Admins.

## Text fallback

Allows you to specify how your interactive post is displayed on platforms that don't support Devvit, for example old.reddit.com

## Cache helper

Allows you to cache fetch requests on the server side, reducing the number of requests made to external APIs and improving performance.


<!-- ============ /docs/capabilities/server/triggers ============ -->

> source: https://developers.reddit.com/docs/capabilities/server/triggers

- 
- Automation & Triggers
- Triggers

# Triggers

Triggers allow your app to automatically respond to specific events or actions within a Reddit community. Use triggers to build automation, moderation, and engagement features that react to user or moderator activity.

## What are triggers?

A trigger is an action you can build into your app that will occur automatically when a specified condition is met. For example, you can set up a trigger to respond when a new post is submitted, a comment is created, or a moderator takes action.

## Supported trigger types

Event triggers let your app automatically respond to a user's or moderator's action. The following trigger types are supported:

- `onPostSubmit`

- `onPostCreate`

- `onPostUpdate`

- `onPostReport`

- `onPostDelete`

- `onPostFlairUpdate`

- `onCommentCreate`

- `onCommentDelete`

- `onCommentReport`

- `onCommentSubmit`

- `onCommentUpdate`

- `onPostNsfwUpdate`

- `onPostSpoilerUpdate`

- `onAppInstall`

- `onAppUpgrade`

- `onModAction`

- `onModMail`

- `onAutomoderatorFilterPost`

- `onAutomoderatorFilterComment`

A full list of events and their payloads can be found in the EventTypes documentation. For more details on Mod specific actions, see ModActions and ModMail.

## Setting up triggers

### 1. Add triggers and endpoints to devvit.json

Declare the triggers and their corresponding endpoints in your `devvit.json`:

```
"triggers": { "onAppUpgrade": "/internal/on-app-upgrade", "onCommentCreate": "/internal/on-comment-create", "onPostSubmit": "/internal/on-post-submit"}
```

### 2. Handle trigger events in your server logic

Listen for the events in your server and access the data passed into the request:

- Hono
- Express
server/index.ts

```
import type { OnAppUpgradeRequest, OnCommentCreateRequest, OnPostSubmitRequest, TriggerResponse,} from '@devvit/web/shared';app.post('/internal/on-app-upgrade', async (c) => { console.log('Handle event for on-app-upgrade!'); const input = await c.req.json(); const installer = input.installer; console.log('Installer:', JSON.stringify(installer, null, 2)); return c.json({ status: 'ok' });});app.post('/internal/on-comment-create', async (c) => { console.log('Handle event for on-comment-create!'); const input = await c.req.json(); const comment = input.comment; const author = input.author; console.log('Comment:', JSON.stringify(comment, null, 2)); console.log('Author:', JSON.stringify(author, null, 2)); return c.json({ status: 'ok' });});app.post('/internal/on-post-submit', async (c) => { console.log('Handle event for on-post-submit!'); const input = await c.req.json(); const post = input.post; const author = input.author; console.log('Post:', JSON.stringify(post, null, 2)); console.log('Author:', JSON.stringify(author, null, 2)); return c.json({ status: 'ok' });});
```

server/index.ts

```
import type { OnAppUpgradeRequest, OnCommentCreateRequest, OnPostSubmitRequest, TriggerResponse,} from '@devvit/web/shared';const router = express.Router();// ..router.post( "/internal/on-app-upgrade", async (req, res) => { console.log(`Handle event for on-app-upgrade!`); const installer = req.body.installer; console.log("Installer:", JSON.stringify(installer, null, 2)); res.status(200).json({ status: "ok" });});router.post( "/internal/on-comment-create", async (req, res) => { console.log(`Handle event for on-comment-create!`); const comment = req.body.comment; const author = req.body.author; console.log("Comment:", JSON.stringify(comment, null, 2)); console.log("Author:", JSON.stringify(author, null, 2)); res.status(200).json({ status: "ok" });});router.post( "/internal/on-post-submit", async (req, res) => { console.log(`Handle event for on-post-submit!`); const post = req.body.post; const author = req.body.author; console.log("Post:", JSON.stringify(post, null, 2)); console.log("Author:", JSON.stringify(author, null, 2)); res.status(200).json({ status: "ok" });});
```

## Best practices

- Avoid creating recursive triggers that could cause infinite loops or crashes (for example, a comment trigger that creates a comment).

- Always check the event payload to ensure your app is not the source of the event before taking action.

- Review the EventTypes documentation for details on event payloads.


<!-- ============ /docs/capabilities/server/scheduler ============ -->

> source: https://developers.reddit.com/docs/capabilities/server/scheduler

- 
- Automation & Triggers
- Scheduler

# Scheduler

The scheduler allows your app to perform actions at specific times, such as sending private messages, tracking upvotes, or scheduling timeouts for user actions. You can schedule both recurring and one-off jobs using the scheduler.

## Scheduling recurring jobs

To create a regularly occurring event in your app, declare a task in your `devvit.json` and handle the event in your server logic.

### 1. Add a recurring task to devvit.json

Ensure the endpoint follows the format `/internal/.+` and specify a `cron` schedule:

devvit.json

```
"scheduler": { "tasks": { "regular-interval-example-task": { "endpoint": "/internal/scheduler/regular-interval-task-example", "cron": "*/1 * * * *" } }},
```

- The `cron` parameter uses the standard UNIX cron format:

```
# * * * * *# | | | | |# | | | | day of the week (0–6, Sunday to Saturday; 7 is also Sunday on some systems)# | | | month (1–12)# | | day of the month (1–31)# | hour (0–23)# minute (0–59)
```

- We recommend using Cronitor to build cron strings.

### 2. Handle the event in your server

- Hono
- Express
/server/index.ts

```
import type { TaskRequest, TaskResponse } from "@devvit/web/server";app.post("/internal/scheduler/regular-interval-task-example", async (c) => { const _input = await c.req.json(); console.log(`Handle event for cron example at ${new Date().toISOString()}!`); // Handle the event here return c.json({ status: "ok" }, 200);});
```

/server/index.ts

```
import type { TaskRequest, TaskResponse } from "@devvit/web/server";app.post( "/internal/scheduler/regular-interval-task-example", async (_req, res) => { console.log( `Handle event for cron example at ${new Date().toISOString()}!`, ); // Handle the event here res.status(200).json({ status: "ok" }); },);
```

## Scheduling one-off jobs at runtime

One-off tasks must also be declared in `devvit.json`.

### 1. Add the tasks to devvit.json

devvit.json

```
"scheduler": { "tasks": { "regular-interval-task-example": { "endpoint": "/internal/scheduler/regular-interval-task-example", "cron": "*/1 * * * *" }, "one-off-task-example": { "endpoint": "/internal/scheduler/one-off-task-example" } }}
```

### 2. Schedule a job at runtime

Example usage:

- Hono
- Express
/server/index.ts

```
import type { TaskRequest, TaskResponse } from "@devvit/web/server";app.post("/internal/scheduler/one-off-task-example", async (c) => { const { data } = await c.req.json>(); const { postId } = data!; const oneMinuteFromNow = new Date(Date.now() + 1000 * 60); const scheduledJob: ScheduledJob = { id: `job-one-off-for-post${postId}`, name: "one-off-task-example", data: { postId }, runAt: oneMinuteFromNow, }; const jobId = await scheduler.runJob(scheduledJob); console.log(`Scheduled job ${jobId} for post ${postId}`); console.log(`Handle event for one-off event at ${new Date().toISOString()}!`); // Handle the event here return c.json({ status: "ok" }, 200);});
```

/server/index.ts

```
import type { TaskRequest, TaskResponse } from "@devvit/web/server";app.post>( "/internal/scheduler/one-off-task-example", async (req, res) => { const { data } = req.body; const { postId } = data!; const oneMinuteFromNow = new Date(Date.now() + 1000 * 60); const scheduledJob: ScheduledJob = { id: `job-one-off-for-post${postId}`, name: "one-off-task-example", data: { postId }, runAt: oneMinuteFromNow, }; const jobId = await scheduler.runJob(scheduledJob); console.log(`Scheduled job ${jobId} for post ${postId}`); console.log(`Handle event for one-off event at ${new Date().toISOString()}!`); // Handle the event here res.status(200).json({ status: "ok" }); },);
```

## Cancel a scheduled job

Use the job ID to cancel a scheduled action and remove it from your app. This example shows how to set up a moderator menu action to cancel a job.

### 1. Add menu item to devvit.json

devvit.json

```
{ "menu": { "items": [ { "label": "Cancel Job", "description": "Cancel a scheduled job", "forUserType": "moderator", "location": "post", "endpoint": "/internal/menu/cancel-job" } ] }, "permissions": { "redis": true }}
```

### 2. Handle the menu action in your server

- Hono
- Express
/server/index.ts

```
import type { MenuItemRequest, UiResponse } from "@devvit/web/shared";app.post("/internal/menu/cancel-job", async (c) => { try { // Get the post ID from the menu action request const { targetId: postId } = await c.req.json(); // Retrieve the job ID from Redis (stored when the job was created) const jobId = await redis.get(`job:${postId}`); if (!jobId) { return c.json({ showToast: { text: "No scheduled job found for this post", appearance: "neutral", }, }); } // Cancel the scheduled job await scheduler.cancelJob(jobId); // Clean up the stored job ID await redis.del(`job:${postId}`); return c.json({ showToast: { text: "Successfully cancelled the scheduled job", appearance: "success", }, }); } catch (error) { console.error("Error cancelling job:", error); return c.json({ showToast: { text: "Failed to cancel job", appearance: "neutral", }, }); }});
```

/server/index.ts

```
import type { MenuItemRequest, UiResponse } from "@devvit/web/shared";app.post( "/internal/menu/cancel-job", async (req, res) => { try { // Get the post ID from the menu action request const postId = req.body.targetId; // Retrieve the job ID from Redis (stored when the job was created) const jobId = await redis.get(`job:${postId}`); if (!jobId) { return res.json({ showToast: { text: "No scheduled job found for this post", appearance: "neutral", }, }); } // Cancel the scheduled job await scheduler.cancelJob(jobId); // Clean up the stored job ID await redis.del(`job:${postId}`); return res.json({ showToast: { text: "Successfully cancelled the scheduled job", appearance: "success", }, }); } catch (error) { console.error("Error cancelling job:", error); return res.json({ showToast: { text: "Failed to cancel job", appearance: "neutral", }, }); } },);
```

### Example: Storing a job ID when creating a job

When you create a scheduled job, store its ID in Redis so you can reference it later

- Hono
- Express
/server/index.ts

```
type ScheduleActionRequest = { postId: string; delayMinutes: number };type ScheduleActionResponse = { jobId: string; message: string };app.post("/api/schedule-action", async (c) => { const { postId, delayMinutes } = await c.req.json(); const runAt = new Date(Date.now() + delayMinutes * 60 * 1000); const scheduledJob: ScheduledJob = { id: `job-${postId}-${Date.now()}`, name: "one-off-task-example", data: { postId }, runAt, }; const jobId = await scheduler.runJob(scheduledJob); // Store the job ID in Redis for later cancellation await redis.set(`job:${postId}`, jobId); return c.json({ jobId, message: "Job scheduled successfully", });});
```

/server/index.ts

```
type ScheduleActionRequest = { postId: string; delayMinutes: number };type ScheduleActionResponse = { jobId: string; message: string };app.post( "/api/schedule-action", async (req, res) => { const { postId, delayMinutes } = req.body; const runAt = new Date(Date.now() + delayMinutes * 60 * 1000); const scheduledJob: ScheduledJob = { id: `job-${postId}-${Date.now()}`, name: "one-off-task-example", data: { postId }, runAt, }; const jobId = await scheduler.runJob(scheduledJob); // Store the job ID in Redis for later cancellation await redis.set(`job:${postId}`, jobId); return res.json({ jobId, message: "Job scheduled successfully", }); },);
```

## List jobs

This example shows how to handle a request within your server/index.ts to list your scheduled jobs and return them to the client.

- Hono
- Express
/server/index.ts

```
type ListJobsSuccessResponse = { status: "success"; jobs: (ScheduledJob | ScheduledCronJob)[]; count: number;};type ListJobsErrorResponse = { status: "error"; message: string };type ListJobsResponse = ListJobsSuccessResponse | ListJobsErrorResponse;app.get("/api/list-jobs", async (c) => { try { const jobs: (ScheduledJob | ScheduledCronJob)[] = await scheduler.listJobs(); console.log(`[LIST] Found ${jobs.length} scheduled jobs`); return c.json
- ({ status: "success", jobs, count: jobs.length, }); } catch (error) { console.error(`[LIST] Error listing jobs:`, error); return c.json
- ( { status: "error", message: error instanceof Error ? error.message : "Failed to list jobs", }, 500, ); }});
```

/server/index.ts

```
type ListJobsSuccessResponse = { status: "success"; jobs: (ScheduledJob | ScheduledCronJob)[]; count: number;};type ListJobsErrorResponse = { status: "error"; message: string };type ListJobsResponse = ListJobsSuccessResponse | ListJobsErrorResponse;app.get( "/api/list-jobs", async (_req, res): Promise => { try { const jobs: (ScheduledJob | ScheduledCronJob)[] = await scheduler.listJobs(); console.log(`[LIST] Found ${jobs.length} scheduled jobs`); res.json({ status: "success", jobs, count: jobs.length, }); } catch (error) { console.error(`[LIST] Error listing jobs:`, error); res.status(500).json({ status: "error", message: error instanceof Error ? error.message : "Failed to list jobs", }); } },);
```

## Faster scheduler

note
This feature is experimental, which means the design is not final but it's still available for you to use.

Scheduled jobs currently perform one scheduled run per minute. To go faster, you can now run jobs every second by adding seconds granularity to your cron expression.

```
await scheduler.runJob({ name: "run_every_30_seconds", cron: "*/30 * * * * *",});
```

How frequent a scheduled job runs will depend on how long the job takes to complete and how many jobs are running in parallel. This means a job may take a bit longer than scheduled, but the overall resolution should be better than a minute.

## Limitations

Limits are per installation of an app:

- An installation can have up to 10 live recurring actions.

- The `runJob()` method enforces two rate limits when creating actions:

- Creation rate: Up to 60 calls to `runJob()` per minute

- Delivery rate: Up to 60 deliveries per minute


<!-- ============ /docs/capabilities/server/redis ============ -->

> source: https://developers.reddit.com/docs/capabilities/server/redis

- 
- Saving Data
- Redis

# Redis

You can add a database to your app to store and retrieve data. The Redis plugin is designed to be fast, scalable, and secure. It supports a subset of the full Redis API, including:

- Transactions for things like counting votes atomically in polls

- String operations for persisting information

- Number operations for incrementing numbers

- Sorted sets for creating leaderboards

- Hashes for managing a collection of key-value pairs

- Bitfields for efficient operation on sequences of bits

Each installation of an app is uniquely name-spaced, which means Redis data is siloed by subreddit. Keep in mind that there won’t be a single source of truth for all installations of your app, since each app installation can only access the data that it has stored in the Redis database.

## Limits and quotas

- Max commands per second: 40000

- Max request size: 5 MB

- Max storage: 500 MB

- Pipelining is not supported

- Sets - only sorted sets are supported

- No support for listing keys

- No support for lua scripts to execute custom logic on redis server

All limits are applied at a per-installation granularity.

## Examples

### Menu actions

devvit.json

```
{ "menuActions": [ { "label": "Redis Test", "endpoint": "/internal/menu/redis-test", "forUserType": "moderator", "location": "subreddit" } ] }
```

- Hono
- Express
server/index.ts

```
import { redis } from '@devvit/redis';import type { MenuItemRequest, UiResponse } from '@devvit/web/shared';app.post('/internal/menu/redis-test', async (c) => { const _request = await c.req.json(); const key = 'hello'; await redis.set(key, 'world'); const value = await redis.get(key); console.log(`${key}: ${value}`); return c.json({ status: 'ok' });});
```

server/index.ts

```
import { redis } from '@devvit/redis';import type { MenuItemRequest, UiResponse } from '@devvit/web/shared';router.post( "/internal/menu/redis-test", async (_req, res) => { const key = 'hello'; await redis.set(key, 'world'); const value = await redis.get(key); console.log(`${key}: ${value}`); res.json({ status: 'ok' }); },);
```

### Games

You can take a look at this Game Template to see a basic implementation of Redis in a game built with Phaser.JS

## Supported Redis commands

note
Not all Redis features are supported. If you would like to request a specific Redis feature, please reach out to our team via modmail or Discord.

For all examples below, we assume that you already have obtained a Redis Client. Here's how to obtain a Redis Client:

devvit.json

```
{ "permissions": { "redis": true } }
```

server/index.ts

```
import { redis } from '@devvit/redis';
```

### Simple read/write

CommandActionLimitsgetGets the value of key.NonesetSets key to hold a string value.Subject to storage quota gating (writes may be blocked if quota exceeded)existsReturns number of given keys that exist.NonedelRemoves the specified keys.NonetypeReturns the string representation of the type of value stored at key.NonerenameRenames a key.None

Code Example
```
async function simpleReadWriteExample() { // Set a key await redis.set('color', 'red'); // Check if a key exists console.log('Key exists: ' + (await redis.exists('color'))); // Get a key console.log('Color: ' + (await redis.get('color'))); // Get the type of a key console.log('Type: ' + (await redis.type('color'))); // Delete a key await redis.del('color');}
```

```
Color: redType: string
```

### Batch read/write

CommandActionLimitsmGetReturns the values of all specified keys.NonemSetSets the given keys to their respective values.Subject to storage quota gating (writes may be blocked if quota exceeded)

Code Example
```
async function batchReadWriteExample() { // Set multiple keys at once await redis.mSet({ name: 'Devvit', occupation: 'Developer', yearsOfExperience: '9000', }); // Get multiple keys console.log('Result: ' + (await redis.mGet(['name', 'occupation'])));}
```

```
Result: Devvit,Developer
```

### Strings

CommandActionLimitsgetRangeReturns the substring of the string value stored at key, determined by the offsets start and end (both are inclusive).NonesetRangeOverwrites part of the string stored at key, starting at the specified offset, for the entire length of value.Subject to storage quota gating (writes may be blocked if quota exceeded)strLenReturns the length of the string value stored at key.None

Code Example
```
async function stringsExample() { // First, set 'word' to 'tacocat' await redis.set('word', 'tacocat'); // Use getRange() to get the letters in 'word' between index 0 to 3, inclusive console.log('Range from index 0 to 3: ' + (await redis.getRange('word', 0, 3))); // Use setRange() to insert 'blue' at index 0 await redis.setRange('word', 0, 'blue'); console.log('Word after using setRange(): ' + (await redis.get('word'))); // Use strLen() to verify the word length console.log('Word length: ' + (await redis.strLen('word')));}
```

```
Range from index 0 to 3: tacoWord after using setRange(): bluecatWord length: 7
```

### Hash

Redis hashes can store up to ~ 4.2 billion key-value pairs. We recommend using hash for managing collections of key-value pairs whenever possible and iterating over it using a combination of `hscan`, `hkeys` and `hgetall`.

CommandActionLimitshGetReturns the value associated with field in the hash stored at key.NonehMGetReturns the value of all specified field in the hash stored at multiple keys.May be disabled for your app (allowlisted feature)hSetSets the specified fields to their respective values in the hash stored at key.Subject to storage quota gating (writes may be blocked if quota exceeded)hSetNXSets field in the hash stored at key to value, only if field does not yet exist.ƒSubject to storage quota gating (writes may be blocked if quota exceeded)hDelRemoves the specified fields from the hash stored at key.NonehGetAllReturns a map of fields and their values stored in the hash.NonehKeysReturns all field names in the hash stored at key.NonehScanIterates fields of Hash types and their associated values.No server-side cap; uses requested counthIncrByIncrements the score of member in the sorted set stored at key by value.Subject to storage quota gating (writes may be blocked if quota exceeded)hLenReturns the number of fields contained in the hash stored at key.None

Code ExamplesExample 1
```
// Example using hGet(), hSet(), and hDel()async function hashExample1() { // Set 'inventory' with multiple fields and values await redis.hSet('inventory', { sword: '1', potion: '4', shield: '2', stones: '8', }); // Get the value of 'shield' from 'inventory' console.log('Shield count: ' + await redis.hGet('inventory', 'shield')); // Get the values of both of 'shield' and 'potion' from 'inventory' console.log('Shield and potion count: ' + await redis.hMGet('inventory', ['shield', 'potion'])); // Delete some fields from 'inventory' console.log( 'Number of fields deleted: ' + await redis.hDel('inventory', ['sword', 'shield', 'stones']); );}
```

```
Shield count: 2Shield and potion count: 2,4Number of fields deleted: 3
```

Example 2
```
// Example using hGetAll()async function hashExample2() { // Set 'groceryList' to fields containing products with quantities await redis.hSet('groceryList', { eggs: '12', apples: '3', milk: '1', }); // Get the groceryList record const record = await redis.hGetAll('groceryList'); if (record != undefined) { console.log('Eggs: ' + record.eggs + ', Apples: ' + record.apples + ', Milk: ' + record.milk); }}
```

```
Eggs: 12, Apples: 3, Milk: 1
```

Example 3
```
// Example using hKeys()async function hashExample3() { await redis.hSet('prices', { chair: '48', desk: '95', whiteboard: '23', }); console.log('Keys: ' + (await redis.hKeys('prices')));}
```

```
Keys: chair,desk,whiteboard
```

Example 4
```
// Example using hScan()async function hashExample4() { await redis.hSet('userInfo', { name: 'Bob', startDate: '01-05-20', totalAwards: '12', }); // Scan and interate over all the fields within 'userInfo' const hScanResponse = await redis.hScan('userInfo', 0); hScanResponse.fieldValues.forEach((x) => { console.log("Field: '" + x.field + "', Value: '" + x.value + "'"); });}
```

```
Field: 'name', Value: 'Bob'Field: 'totalAwards', Value: '12'Field: 'startDate', Value: '01-05-20'
```

Example 5
```
// Example using hIncrBy()async function hashExample5() { // Set user123's karma to 100 await redis.hSet('user123', { karma: '100' }); // Increase user123's karma by 5 console.log('Updated karma: ' + (await redis.hIncrBy('user123', 'karma', 5)));}
```

```
Updated karma: 105
```

Example 6
```
// Example using hLen()async function hashExample6() { await redis.hSet('supplies', { paperclips: '25', pencils: '10', erasers: '5', pens: '7', }); console.log('Number of fields: ' + (await redis.hLen('supplies')));}
```

```
Number of fields: 4
```

### Numbers

CommandActionLimitsincrByIncrements the number stored at key by increment.Subject to storage quota gating (writes may be blocked if quota exceeded)

Code Example
```
async function numbersExample() { await redis.set('totalPoints', '53'); console.log('Updated points: ' + (await redis.incrBy('totalPoints', 100)));}
```

```
Updated points: 153
```

### Key expiration

CommandActionLimitsexpireSets a timeout on key.NoneexpireTimeReturns the remaining seconds at which the given key will expire.None

Code Example
```
async function keyExpirationExample() { // Set a key 'product' with value 'milk' await redis.set('product', 'milk'); // Get the current expireTime for the product console.log('Expire time: ' + (await redis.expireTime('product'))); // Set the product to expire in 60 seconds await redis.expire('product', 60); // Get the updated expireTime for the product console.log('Updated expire time: ' + (await redis.expireTime('product')));}
```

```
Expire time: 0Updated expire time: 60
```

### Transactions

Redis transactions allow a group of commands to be executed in a single isolated step. For example, to implement voting action in a polls app, these three actions need to happen together:

- Store the selected option for the user.

- Increment the count for selected option.

- Add the user to voted user list.

The `watch` command provides an entrypoint for transactions. It returns a TxClientLike which can be used to call `multi`, `exec`, `discard`, `unwatch`, and all other Redis commands to be executed within a transaction.

You can sequence all of the above steps in a single transaction using `multi` and `exec` to ensure that either all of the steps happen together or none at all.

If an error occurs inside a transaction before `exec` is called, Redis discards the transaction automatically. See the Redis docs: Errors inside a transaction for more info.

CommandActionLimitsmultiMarks the start of a transaction block.Max concurrent transactions per installation: 20 (default)execExecutes all previously queued commands in a transaction and restores the connection state to normal.Transaction execution timeout: 5 secondsdiscardFlushes all previously queued commands in a transaction and restores the connection state to normal.NonewatchMarks the given keys to be watched for conditional execution of a transaction. `watch` returns a TxClientLike which should be used to call Redis commands in a transaction.NoneunwatchFlushes all the previously watched keys for a transaction.None

Code ExamplesExample 1
```
// Example using exec()async function transactionsExample1() { await redis.mSet({ quantity: '5', karma: '32' }); const txn = await redis.watch('quantity'); await txn.multi(); // Begin a transaction await txn.incrBy('karma', 10); await txn.set('name', 'Devvit'); await txn.exec(); // Execute the commands in the transaction console.log( 'Keys after completing transaction: ' + (await redis.mGet(['quantity', 'karma', 'name'])) );}
```

```
Keys after completing transaction: 5,42,Devvit
```

Example 2
```
// Example using discard()async function transactionsExample2() { await redis.set('price', '25'); const txn = await redis.watch('price'); await txn.multi(); // Begin a transaction await txn.incrBy('price', 5); await txn.discard(); // Discard the commands in the transaction console.log('Price value: ' + (await redis.get('price'))); // 'price' should still be '25'}
```

```
Price value: 25
```

Example 3
```
// Example using unwatch()async function transactionsExample3() { await redis.set('gold', '50'); const txn = await redis.watch('gold'); await txn.multi(); // Begin a transaction await txn.incrBy('gold', 30); await txn.unwatch(); // Unwatch "gold" // Now that "gold" has been unwatched, we can increment its value // outside the transaction without canceling the transaction await redis.incrBy('gold', -20); await txn.exec(); // Execute the commands in the transaction console.log('Gold value: ' + (await redis.get('gold'))); // The value of 'gold' should be 50 + 30 - 20 = 60}
```

```
Gold value: 60
```

### Sorted set

CommandActionLimitszAddAdds all the specified members with the specified scores to the sorted set stored at key.Subject to storage quota gating (writes may be blocked if quota exceeded)zCardReturns the sorted set cardinality (number of elements) of the sorted set stored at key.NonezRangeReturns the specified range of elements in the sorted set stored at key. When using `by: 'lex'`, the start and stop inputs will be prepended with `[` by default, unless they already begin with `[`, `(` or are one of the special values `+` or `-`.BYSCORE/BYLEX: LIMIT count capped to 1000 per call (server default). RANK: no server cap. Client default for by: 'score'/'lex' is count=1000 when no limit is provided.zRemRemoves the specified members from the sorted set stored at key.NonezScoreReturns the score of member in the sorted set at key.NonezRankReturns the rank of member in the sorted set stored at key.NonezIncrByIncrements the score of member in the sorted set stored at key by value.Subject to storage quota gating (writes may be blocked if quota exceeded)zScanIterates elements of sorted set types and their associated scores. Note that there is no guaranteed ordering of elements in the result.No server-side cap; uses requested countzRemRangeByLexWhen all elements in a sorted set are inserted with the same score, this command removes the elements at key between the lexicographical range specified by min and max.NonezRemRangeByRankRemoves all elements in the sorted set stored at key with rank between start and stop.NonezRemRangeByScoreRemoves all elements in the sorted set stored at key with a score between min and max (inclusive).None

Code ExamplesExample 1
```
// Example using zRange() with by 'score'async function sortedSetExample1() { await redis.zAdd( 'leaderboard', { member: 'louis', score: 37 }, { member: 'fernando', score: 10 }, { member: 'caesar', score: 20 }, { member: 'alexander', score: 25 } ); // Cardinality should be '4' as there are 4 elements in the leaderboard set console.log('Cardinality: ' + (await redis.zCard('leaderboard'))); // View elements with scores between 0 and 30 inclusive, sorted by score let scores = await redis.zRange('leaderboard', 0, 30, { by: 'score' }); console.log('Scores: ' + JSON.stringify(scores)); // Remove 'fernando' from the leaderboard await redis.zRem('leaderboard', ['fernando']); // View the elements sorted by score again. This time 'fernando' should not appear in the output scores = await redis.zRange('leaderboard', 0, 30, { by: 'score' }); console.log('Updated scores: ' + JSON.stringify(scores)); // View caesar's score console.log("Caesar's score: " + (await redis.zScore('leaderboard', 'caesar')));}
```

```
Cardinality: 4Scores: [{"score":10,"member":"fernando"},{"score":20,"member":"caesar"},{"score":25,"member":"alexander"}]Updated scores: [{"score":20,"member":"caesar"},{"score":25,"member":"alexander"}]Caesar's score: 20
```

Example 2
```
// Example using zRange() with by 'lex'async function sortedSetExample2() { await redis.zAdd( 'checkpoints', { member: 'delta', score: 0 }, { member: 'omega', score: 0 }, { member: 'alpha', score: 0 }, { member: 'charlie', score: 0 } ); // View elements between the words 'alpha' and 'fox' inclusive, sorted lexicographically // Note that 'by: "lex"' only works if all elements have the same score const members = await redis.zRange('checkpoints', 'alpha', 'fox', { by: 'lex' }); console.log('Members: ' + JSON.stringify(members));}
```

```
Members: [{"score":0,"member":"alpha"},{"score":0,"member":"charlie"},{"score":0,"member":"delta"}]
```

Example 3
```
// Example using zRange() with by 'rank'async function sortedSetExample3() { await redis.zAdd( 'grades', { member: 'sam', score: 80 }, { member: 'norma', score: 95 }, { member: 'alex', score: 77 }, { member: 'don', score: 84 }, { member: 'zeek', score: 92 } ); // View elements with a rank between 2 and 4 inclusive. Note that ranks start at index 0. const members = await redis.zRange('grades', 2, 4, { by: 'rank' }); console.log('Members: ' + JSON.stringify(members));}
```

```
Members: [{"score":84,"member":"don"},{"score":92,"member":"zeek"},{"score":95,"member":"norma"}]
```

Example 4
```
// Example using zRank() and zIncrBy()async function sortedSetExample4() { await redis.zAdd( 'animals', { member: 'zebra', score: 92 }, { member: 'cat', score: 100 }, { member: 'dog', score: 95 }, { member: 'elephant', score: 97 } ); // View the rank of 'dog' in the animals set // Rank should be '1' since 'dog' has the second lowest score. Note that ranks start at index 0. console.log("Dog's rank: " + (await redis.zRank('animals', 'dog'))); // View the rank of 'zebra' console.log("Zebra's rank: " + (await redis.zRank('animals', 'zebra'))); // Increase the score of 'dog' by 10 await redis.zIncrBy('animals', 'dog', 10); // View the rank of 'dog' again. This time it should be '3' because dog has the highest score. console.log( "Dog's rank after incrementing score: " + (await redis.zRank('animals', 'dog')) );}
```

```
Dog's rank: 1Zebra's rank: 0Dog's rank after incrementing score: 3
```

Example 5
```
// Example using zRemRangeByLex()async function sortedSetExample5() { await redis.zAdd( 'fruits', { member: 'kiwi', score: 0 }, { member: 'mango', score: 0 }, { member: 'banana', score: 0 }, { member: 'orange', score: 0 }, { member: 'apple', score: 0 } ); // Remove fruits alphabetically ordered between 'kiwi' inclusive and 'orange' exclusive // Note: The symbols '[' and '(' indicate inclusive or exclusive, respectively. These must be included in the call to zRemRangeByLex(). await redis.zRemRangeByLex('fruits', '[kiwi', '(orange'); // Only 'apple', 'banana', and 'orange' should remain in the set const zScanResponse = await redis.zScan('fruits', 0); console.log('zScanResponse: ' + JSON.stringify(zScanResponse));}
```

```
zScanResponse: {"cursor":0,"members":[{"score":0,"member":"apple"},{"score":0,"member":"banana"},{"score":0,"member":"orange"}]}
```

Example 6
```
// Example using zRemRangeByRank()async function sortedSetExample6() { await redis.zAdd( 'fruits', { member: 'kiwi', score: 10 }, { member: 'mango', score: 20 }, { member: 'banana', score: 30 }, { member: 'orange', score: 40 }, { member: 'apple', score: 50 } ); // Remove fruits ranked 1 through 3 inclusive await redis.zRemRangeByRank('fruits', 1, 3); // Only 'kiwi' and 'apple' should remain in the set const zScanResponse = await redis.zScan('fruits', 0); console.log('zScanResponse: ' + JSON.stringify(zScanResponse));}
```

```
zScanResponse: {"cursor":0,"members":[{"score":10,"member":"kiwi"},{"score":50,"member":"apple"}]}
```

Example 7
```
// Example using zRemRangeByScore() exampleasync function sortedSetExample7() { await redis.zAdd( 'fruits', { member: 'kiwi', score: 10 }, { member: 'mango', score: 20 }, { member: 'banana', score: 30 }, { member: 'orange', score: 40 }, { member: 'apple', score: 50 } ); // Remove fruits scored between 30 and 50 inclusive await redis.zRemRangeByScore('fruits', 30, 50); // Only 'kiwi' and 'mango' should remain in the set const zScanResponse = await redis.zScan('fruits', 0); console.log('zScanResponse: ' + JSON.stringify(zScanResponse));}
```

```
zScanResponse: {"cursor":0,"members":[{"score":10,"member":"kiwi"},{"score":20,"member":"mango"}]}
```

### Bitfield

CommandActionLimitsbitfieldPerforms a sequence of operations on a bit stringSubject to storage quota gating (writes may be blocked if quota exceeded)

Code Example
```
async function bitfieldExample() { const setBits: number[] = await redis.bitfield('foo', 'set', 'i5', '#0', 11); console.log('Set result: ' + setBits); // [0] const getBits: number[] = await redis.bitfield('foo', 'get', 'i5', '#0'); console.log('Get result: ' + setBits); // [11] const manyOperations: number[] = await redis.bitfield( 'bar', 'set', 'u2', 0, 3, 'get', 'u2', 0, 'incrBy', 'u2', 0, 1, 'overflow', 'sat', 'get', 'u2', 0, 'set', 'u2', 0, 3, 'incrBy', 'u2', 0, 1 ); console.log('Results of many operations: ' + manyOperations); // [0, 3, 0, 0, 3, 3]}
```

```
fooResults: [1, 0]barResults: [0, 3, 0, 0, 3, 3]
```

## Compression (Experimental)

The Redis package includes a `redisCompressed` client that transparently handles compression and decompression of values. This is useful for storing large strings or JSON objects that exceed the Redis storage limits or to optimize storage usage.

To use it, update your import:

```
// import { redis } from '@devvit/redis';import { redisCompressed as redis } from '@devvit/redis';
```

warning
One-Way Migration: Once you start using `redisCompressed` and writing compressed data, switching back to the standard `redis` client will result in errors when reading that data, as the standard client does not know how to decompress the values.

The `redisCompressed` client automatically:

- Compresses values on write (`set`, `hSet`, `mSet`, `hSetNX`) if it saves space.

- Decompresses values on read (`get`, `hGet`, `mGet`, `hMGet`, `hGetAll`).

Note: Existing uncompressed data is not automatically compressed when read. It is only compressed when you write it back. To migrate existing large datasets, you need to read and re-write the data.

### Migration Example

Migrating large datasets can take time. To avoid the 30-second execution timeout, we recommend using a scheduled job that processes data in chunks and "daisy chains" itself until completion.

Here is an example of how to implement a migration tool using a Menu Item and the Scheduler.

Register your form handler, menu trigger, and scheduler endpoint here.

```
{ "forms": { "migrateExampleForm": "/internal/form/ops/migrate-example" }, "menu": { "items": [ { "label": "[ops] Migrate Data to Compression", "location": "subreddit", "forUserType": "moderator", "endpoint": "/internal/menu/ops/migrate-example" } ] }, "scheduler": { "tasks": { "migrate-example-data": { "endpoint": "/internal/scheduler/migrate-example-data" } } }}
```

Add these route handlers to your server.

- Hono
- Express

```
import { redis, scheduler, type TaskRequest, type TaskResponse } from '@devvit/web/server';// Import the compressed clientimport { redisCompressed } from '@devvit/redis';import type { MenuItemRequest, UiResponse } from '@devvit/web/shared';type MigrateExampleFormRequest = { startCursor?: string; chunkSize?: number;};type MigrateExampleJobData = { cursor?: number | string; chunkSize?: number; processed?: number;};const MY_DATA_HASH_KEY = 'my:app:large:dataset';// 1. Menu Endpoint: Returns the form definitionapp.post('/internal/menu/ops/migrate-example', async (c) => { const _request = await c.req.json(); return c.json({ showForm: { name: 'migrateExampleForm', // Must match key in devvit.json "forms" form: { title: 'Migrate Hash to Compression', acceptLabel: 'Start Migration', fields: [ { name: 'startCursor', label: 'Start Cursor (0 for beginning)', type: 'string', defaultValue: '0', }, { name: 'chunkSize', label: 'Items per batch', type: 'number', defaultValue: 20000, }, ], }, }, });});// 2. Form Handler: Receives input and schedules the first jobapp.post('/internal/form/ops/migrate-example', async (c) => { const body = await c.req.json().catch( () => ({} as MigrateExampleFormRequest) ); const cursor = body.startCursor || '0'; const size = Number(body.chunkSize) || 20000; console.log(`[Migration] Manual start requested. Cursor: ${cursor}, Chunk: ${size}`); // Kick off the first job in the chain await scheduler.runJob({ name: 'migrate-example-data', runAt: new Date(), // Run immediately data: { cursor, chunkSize: size, processed: 0, }, }); return c.json({ showToast: { text: 'Migration started in background', appearance: 'success', }, });});// 3. Scheduler Endpoint: The recursive workerapp.post('/internal/scheduler/migrate-example-data', async (c) => { const startTime = Date.now(); try { const body = await c.req.json>().catch( () => ({} as TaskRequest) ); const data = body.data; let cursor = Number(data?.cursor) || 0; const chunkSize = Number(data?.chunkSize) || 20000; const processedTotal = Number(data?.processed) || 0; console.log(`[Migration] Job started. Cursor: ${cursor}, Target Chunk: ${chunkSize}`); let keepRunning = true; let processedInJob = 0; const SCAN_COUNT = 250; // Internal batch size to keep event loop moving while (keepRunning) { // Stop if we've processed enough items for this single execution if (processedInJob >= chunkSize) { break; } const { cursor: nextCursor, fieldValues } = await redis.hScan( MY_DATA_HASH_KEY, cursor, undefined, // match pattern SCAN_COUNT ); // Parallel Processing: // We treat the batch as a set of promises to execute simultaneously. // Promise.allSettled ensures one failure doesn't crash the whole job. await Promise.allSettled( fieldValues.map(async ({ field, value }) => { // LOGIC: // 1. We read the raw value. // 2. We write it back using 'redisCompressed'. // The proxy detects the write and compresses the string if beneficial. if (value && value.length > 0) { await redisCompressed.hSet(MY_DATA_HASH_KEY, { [field]: value }); } }) ); processedInJob += fieldValues.length; // Cursor logic: 0 means iteration is complete if (nextCursor === 0) { cursor = 0; keepRunning = false; } else { cursor = nextCursor; } // Safety: Check execution time. // If we are close to 30s (Devvit limit), stop early and requeue. if (Date.now() - startTime > 20000) { console.log('[Migration] Time limit approaching, stopping early.'); keepRunning = false; } } const newTotal = processedTotal + processedInJob; // Daisy Chaining: // If the cursor is not 0, we still have more data to scan. // We schedule *this same job* to run again immediately. if (cursor !== 0) { console.log(`[Migration] Requeueing. Next cursor: ${cursor}. Processed so far: ${newTotal}`); await scheduler.runJob({ name: 'migrate-example-data', runAt: new Date(), data: { cursor, chunkSize, processed: newTotal, }, }); return c.json({ status: 'requeued', processed: newTotal, cursor }); } console.log(`[Migration] COMPLETE. Total items processed: ${newTotal}`); return c.json({ status: 'success', processed: newTotal }); } catch (error) { console.error('[Migration] Critical Job Error', error); return c.json({ status: 'error', message: error.message }, 500); }});
```

```
import { redis, scheduler, type TaskRequest, type TaskResponse } from '@devvit/web/server';// Import the compressed clientimport { redisCompressed } from '@devvit/redis';import type { MenuItemRequest, UiResponse } from '@devvit/web/shared';type MigrateExampleFormRequest = { startCursor?: string; chunkSize?: number;};type MigrateExampleJobData = { cursor?: number | string; chunkSize?: number; processed?: number;};const MY_DATA_HASH_KEY = 'my:app:large:dataset';// 1. Menu Endpoint: Returns the form definitionapp.post( '/internal/menu/ops/migrate-example', async (_req, res) => { res.json({ showForm: { name: 'migrateExampleForm', // Must match key in devvit.json "forms" form: { title: 'Migrate Hash to Compression', acceptLabel: 'Start Migration', fields: [ { name: 'startCursor', label: 'Start Cursor (0 for beginning)', type: 'string', defaultValue: '0', }, { name: 'chunkSize', label: 'Items per batch', type: 'number', defaultValue: 20000, }, ], }, }, }); },);// 2. Form Handler: Receives input and schedules the first jobapp.post( '/internal/form/ops/migrate-example', async (req, res) => { const { startCursor, chunkSize } = req.body ?? ({} as MigrateExampleFormRequest); const cursor = startCursor || '0'; const size = Number(chunkSize) || 20000; console.log(`[Migration] Manual start requested. Cursor: ${cursor}, Chunk: ${size}`); // Kick off the first job in the chain await scheduler.runJob({ name: 'migrate-example-data', runAt: new Date(), // Run immediately data: { cursor, chunkSize: size, processed: 0, }, }); res.json({ showToast: { text: 'Migration started in background', appearance: 'success', }, }); },);// 3. Scheduler Endpoint: The recursive workerapp.post>( '/internal/scheduler/migrate-example-data', async (req, res) => { const startTime = Date.now(); try { const data = req.body.data; let cursor = Number(data?.cursor) || 0; const chunkSize = Number(data?.chunkSize) || 20000; const processedTotal = Number(data?.processed) || 0; console.log(`[Migration] Job started. Cursor: ${cursor}, Target Chunk: ${chunkSize}`); let keepRunning = true; let processedInJob = 0; const SCAN_COUNT = 250; // Internal batch size to keep event loop moving while (keepRunning) { // Stop if we've processed enough items for this single execution if (processedInJob >= chunkSize) { break; } const { cursor: nextCursor, fieldValues } = await redis.hScan( MY_DATA_HASH_KEY, cursor, undefined, // match pattern SCAN_COUNT ); // Parallel Processing: // We treat the batch as a set of promises to execute simultaneously. // Promise.allSettled ensures one failure doesn't crash the whole job. await Promise.allSettled( fieldValues.map(async ({ field, value }) => { // LOGIC: // 1. We read the raw value. // 2. We write it back using 'redisCompressed'. // The proxy detects the write and compresses the string if beneficial. if (value && value.length > 0) { await redisCompressed.hSet(MY_DATA_HASH_KEY, { [field]: value }); } }) ); processedInJob += fieldValues.length; // Cursor logic: 0 means iteration is complete if (nextCursor === 0) { cursor = 0; keepRunning = false; } else { cursor = nextCursor; } // Safety: Check execution time. // If we are close to 30s (Devvit limit), stop early and requeue. if (Date.now() - startTime > 20000) { console.log('[Migration] Time limit approaching, stopping early.'); keepRunning = false; } } const newTotal = processedTotal + processedInJob; // Daisy Chaining: // If the cursor is not 0, we still have more data to scan. // We schedule *this same job* to run again immediately. if (cursor !== 0) { console.log(`[Migration] Requeueing. Next cursor: ${cursor}. Processed so far: ${newTotal}`); await scheduler.runJob({ name: 'migrate-example-data', runAt: new Date(), data: { cursor, chunkSize, processed: newTotal, }, }); res.json({ status: 'requeued', processed: newTotal, cursor }); } else { console.log(`[Migration] COMPLETE. Total items processed: ${newTotal}`); res.json({ status: 'success', processed: newTotal }); } } catch (error) { console.error('[Migration] Critical Job Error', error); res.status(500).json({ status: 'error', message: error.message }); } },);
```

Note that the job may timeout, in which case you will need to find the last logged cursor to start the menu item action job again. Try adjusting the chunk size if you experience timeouts.

You can monitor the migration progress using the logs command:

```
devvit logs r/my-subreddit-to-migrate --since=1h --verbose
```


<!-- ============ /docs/capabilities/server/reddit-api ============ -->

> source: https://developers.reddit.com/docs/capabilities/server/reddit-api

- 
- Reddit API
- Reddit API Overview

# Reddit API Overview

The Reddit API allows you to read and write Reddit content such as posts / comments / upvotes, in order to integrate your app's behavior with the content of the community it's installed in.

note
Unlike traditional Reddit API usage, you don't need to create an app at reddit.com/prefs/apps or manage API keys. Devvit handles authentication automatically when you enable the `reddit` permission in your app.

## Private user data

Devvit apps cannot access certain private user data. This data is private to the logged-in user and is not exposed through the Devvit platform:

- Subscribed subreddits - The list of subreddits a user is subscribed to

- Upvoted and downvoted content - Posts and comments the user has voted on

- Saved content - Posts and comments the user has saved

- Recently viewed posts - The user's browsing history

- Private profile information - Any profile data that is not publicly visible

- Follows and friends - The list of users someone follows (on reddit.com) or has friended (on Old Reddit)

## The Reddit client

Here's how to obtain a reference to the Reddit client

devvit.json

```
{ "permissions": { "reddit": true }}
```

server/index.ts

```
import { reddit } from '@devvit/reddit';
```

## Reddit Thing IDs

Reddit uses prefixed IDs (called "things") to identify different types of content:

PrefixTypeExampleDescription`t1_`Comment`t1_abc123`A comment on a post or reply to another comment`t2_`User`t2_xyz789`A Reddit user account`t3_`Post`t3_def456`A post`t4_`Message`t4_ghi012`A private message`t5_`Subreddit`t5_jkl345`A subreddit community

These IDs are returned by API methods and used when referencing specific content:

```
// Get a post by its full IDconst post = await reddit.getPostById('t3_abc123');// Get a comment by its full ID const comment = await reddit.getCommentById('t1_xyz789');// A comment's parentId can be either a post (t3_) or another comment (t1_)const parentId = comment.parentId; // 't3_abc123' or 't1_def456'
```

## Example usage

### Submitting a post

```
import { Devvit } from '@devvit/public-api';import { context, reddit } from '@devvit/web/server';export const createPost = async () => { const { subredditName } = context; if (!subredditName) { throw new Error('subredditName is required'); } return await reddit.submitCustomPost({ userGeneratedContent: { text: 'Hello there! This is a post from a Devvit app', }, subredditName: subredditName, title: 'New Post', entry: 'default', });};
```

### Submitting a comment

note
Auto-comments should be used to spark conversation in the post comments, but you should avoid lower-signal updates (e.g., level/progress pings).

```
import { context, reddit } from '@devvit/web/server';export const createComment = async () => { const { subredditName } = context; if (!subredditName) { throw new Error('subredditName is required'); } reddit.submitComment({ postId: 't3_123456', // Replace with the actual post ID text: 'This is a comment from a Devvit app', runAs: 'USER' // Optional: specify the user to run as });};
```


<!-- ============ /docs/capabilities/server/userActions ============ -->

> source: https://developers.reddit.com/docs/capabilities/server/userActions

- 
- User Input
- User Actions

# User Actions

User actions allow your app to submit posts, submit comments, and subscribe to the current subreddit on behalf of the logged in user. These actions occur on the logged in user's account instead of the app account. This enables stronger user engagement while ensuring user control and transparency.

## What are user actions?

By default, apps make posts or comments using their associated app account. With user actions enabled, your app can:

- Create posts or comments on behalf of the user (from the post UI, a form, or a menu action)

- Subscribe the user to the current subreddit

Some actions are not available to apps to prevent abuse and maintain platform integrity:

- Apps cannot upvote or downvote posts or comments, either as the app account or on behalf of the logged-in user

- Apps cannot follow users (on reddit.com) or add friends (on old.reddit.com), either as the app account or on behalf of the logged-in user

## Requirements

To ensure a positive user experience and compliance with Reddit policies:

- Always ask permission: Your app must always inform users before posting, commenting, or subscribing on their behalf. This can only happen on an explicit manual action, e.g. from a button.

- No automated actions: Users must explicitly opt-in to the app acting on their behalf. Do not mislead or surprise users.

- Establish a reporting flow: Ensure `userGeneratedContent` is correctly set for posts submitted on behalf of the user.

- Do not gate any functionality: Users should not be made or encouraged to post, comment, or subscribe to continue using your app.

- Keep actions separate: Do not merge posting, commenting, or subscribing with other app actions (e.g., gameplay progression). Each must remain a distinct, clear choice.

- Remember the human: Follow Reddit's safety and compliance guidelines for user-generated content. Do not create spam-like content or poor user experiences in pursuit of engagement.

## Enabling user actions

To enable user actions, add the required permissions to your `devvit.json`:

devvit.json

```
"permissions": { "reddit": { "asUser": [ "SUBMIT_POST", "SUBMIT_COMMENT", "SUBSCRIBE_TO_SUBREDDIT" ] }}
```

After enabling, you can call certain Reddit APIs on behalf of the user by passing the option `runAs: 'USER'`. The following APIs support this option:

- submitPost()

- submitCustomPost()

- submitComment()

If `runAs` is not specified, the API will use `runAs: 'APP'` by default.

### Parameters

ParameterDescription`runAs`The type of account to perform the action on behalf of: `'USER'` or `'APP'`. Defaults to `'APP'`.`userGeneratedContent`Text or images submitted by the user. Required for `submitPost()` with `runAs: 'USER'` for safety and compliance review.

### Differences during playtesting

Your app version needs to be approved in order for user actions to be enabled for all users. Expect the following behavior:

- Unapproved/playtest apps:

- `runAs: 'USER'` will operate from the app account unless the app owner takes the action.

- User actions taken by the app owner will be attributed to the app owner's username.

- Approved apps:

- After publishing and approval, `runAs: 'USER'` will operate on behalf of the user for all users.

## Example: Submit a post as the user

- Hono
- Express
server/index.ts

```
import { reddit } from '@devvit/web/server';// ...app.post('/internal/post-create', async (c) => { const { subredditName } = context; if (!subredditName) { return c.json({ status: 'error', message: 'subredditName is required' }, 400); } reddit.submitPost({ runAs: 'USER', userGeneratedContent: { text: "Hello there! This is a new post from the user's account", }, subredditName, title: 'Post Title', entry: 'default', }); return c.json({ status: 'success', message: `Post created in subreddit ${subredditName}` });});
```

server/index.ts

```
import { reddit } from '@devvit/web/server';// ...router.post('/internal/post-create', async (_req, res) => { const { subredditName } = context; if (!subredditName) { res.status(400).json({ status: 'error', message: 'subredditName is required' }); return; } reddit.submitPost({ runAs: 'USER', userGeneratedContent: { text: "Hello there! This is a new post from the user's account", }, subredditName, title: 'Post Title', entry: 'default', }); res.json({ status: 'success', message: `Post created in subreddit ${subredditName}` });});
```

## Example: Subscribe to current subreddit

The subscribeToCurrentSubreddit() API does not take a `runAs` parameter; it subscribes as the user by default (if specified in `devvit.json` and approved).

- Hono
- Express

```
import { reddit } from '@devvit/web/server';app.post('/api/subscribe', async (c) => { try { await reddit.subscribeToCurrentSubreddit(); return c.json({ status: 'success' }); } catch (error) { return c.json({ status: 'error', message: 'Failed to subscribe' }, 500); }});
```

```
import { reddit } from '@devvit/web/server';router.post('/api/subscribe', async (_req, res) => { try { await reddit.subscribeToCurrentSubreddit(); res.json({ status: 'success' }); } catch (error) { res.status(500).json({ status: 'error', message: 'Failed to subscribe' }); }});
```

For user privacy there is no API to check if the user is already subscribed to the current subreddit. You may want to store the subscription state in Redis to provide contextually aware UI.

## Adding user actions to games

### End-of-game actions

✅ An example of a clear end-of-game layout:

- `Play Again`

- `Comment My Score`

- `Subscribe to r/your_subreddit`

This example keeps each action separate and straightforward for the user. Playing again, commenting, and subscribing are distinct decisions and are therefore presented as distinct actions.

❌ An example of an unclear end-of-game layout:

- `Play Again and Subscribe`

- `Post Score to Play Next Level`

- `Comment & Continue`

This example mixes intention and is confusing for the user. Apps like this that merge functionality (e.g. playing again) with user actions (e.g. subscribing or commenting) will be rejected during review.

### Commenting scores

✅ The required pattern for commenting scores is:

- Commenting after explicit manual action (e.g. from a button)

- Commenting by the user (not the app account)

- Commenting as a reply to a single stickied comment

This avoids surprising the user, enables a reporting flow, and allows the user to easily delete their score comment. Replying to a stickied comment keeps this repetitive content with low discussion value out of the way, in an area that needs to be expanded to view.

If offering a way for the user to add a custom message to their score, the comment can be posted as a top-level comment. This prioritizes human discussion and creates a more engaging comment section.


<!-- ============ /docs/capabilities/server/cache-helper ============ -->

> source: https://developers.reddit.com/docs/capabilities/server/cache-helper

- 
- Saving Data
- Cache helper

# Cache helper

Cache helper lets you build a more performant app by reducing the number of server side calls for the same data. You can create a short-term cache that stores JSON objects in your Devvit app for a limited amount of time. This is valuable when you have many clients trying to get the same data, for example a stock ticker value or a sports score.

Under the covers, it's Redis plus a local in-memory write-through cache. This provides a pattern for fetching data without involving a scheduler and allows small time-to-live (TTL, ~1 second). Cache helper lets the app make one request for the data, save the response, and provide this response to all users requesting the same data.

warning
Do not cache sensitive information. Cache helper randomly selects one user to make the real request and saves the response to the cache for others to use. You should only use cache helper for non-personalized fetches, since the same response is available to all users.

## Usage

You can import cache helper from `@devvit/web/server` in your server source files. The cache helper is not available client-side, so you will see an error if you try to import it in client source files.

```
import { cache } from '@devvit/web/server';
```

## Parameters

The cache takes a key and a TTL:

ParametersDescription`key`This is a string that identifies a cached response. Instead of making a real request, the app gets the cached response with the key you provide. Make sure to use different keys for different data. For example, if you’re saving post-specific data, add the postId to the cache key, like this: `post_data_${postId})`.`ttl`Time to live is the number of seconds the cached response is expected to be relevant. Once the cached response expires, it will be voided and a real request is made to populate the cache again. You can treat it as a threshold, where ttl of 30 would mean that a request is done no more than once per 30 seconds.

## Example

Here’s a way to set up in-app caching instead of using scheduler or interval to fetch.

- Hono
- Express
server/index.ts

```
import { Hono } from 'hono';import { cache, context, createServer, getServerPort, reddit } from '@devvit/web/server';type SubredditResponse = { type: 'subreddit'; subreddit: string;};type SubredditErrorResponse = { status: 'error'; message: string;};const app = new Hono();app.get('/api/subreddit', async (c) => { const { postId } = context; if (!postId) { console.error('API Subreddit Error: postId not found in devvit context'); return c.json( { status: 'error', message: 'postId is required but missing from context', }, 400 ); } try { const subredditName = await cache( async () => { const subreddit = await reddit.getCurrentSubreddit(); if (!subreddit) { throw new Error('Subreddit is required but missing from context'); } return subreddit.name; }, { key: 'current_subreddit', ttl: 24 * 60 * 60, // expire after one day. } ); console.log(`Current subreddit: ${subredditName}`); return c.json({ type: 'subreddit', subreddit: subredditName, }); } catch (error) { console.error(`API Subreddit Error for post ${postId}:`, error); let errorMessage = 'Unknown error during subreddit retrieval'; if (error instanceof Error) { errorMessage = `Subreddit retrieval failed: ${error.message}`; } return c.json({ status: 'error', message: errorMessage }, 400); }});const server = createServer(app);server.on('error', (err) => console.error(`server error; ${err.stack}`));server.listen(getServerPort());
```

server/index.ts

```
import express from "express"; import { cache, createServer, context, getServerPort, reddit, } from "@devvit/web/server"; type SubredditResponse = { type: "subreddit"; subreddit: string; }; type SubredditErrorResponse = { status: "error"; message: string; }; const app = express(); // Middleware for JSON body parsing app.use(express.json()); // Middleware for URL-encoded body parsing app.use(express.urlencoded({ extended: true })); // Middleware for plain text body parsing app.use(express.text()); const router = express.Router(); router.get( "/api/subreddit", async (_req, res): Promise => { const { postId } = context; if (!postId) { console.error("API Subreddit Error: postId not found in devvit context"); res.status(400).json({ status: "error", message: "postId is required but missing from context", }); return; } try { const subredditName = await cache( async () => { const subreddit = await reddit.getCurrentSubreddit(); if (!subreddit) { throw new Error("Subreddit is required but missing from context"); } return subreddit.name; }, { key: `current_subreddit`, ttl: 24 * 60 * 60 // expire after one day. } ); console.log(`Current subreddit: ${subredditName}`); res.json({ type: "subreddit", subreddit: subredditName, }); } catch (error) { console.error(`API Subreddit Error for post ${postId}:`, error); let errorMessage = "Unknown error during subreddit retrieval"; if (error instanceof Error) { errorMessage = `Subreddit retrieval failed: ${error.message}`; } res.status(400).json({ status: "error", message: errorMessage }); } } ); app.use(router); const server = createServer(app); server.on("error", (err) => console.error(`server error; ${err.stack}`)); server.listen(getServerPort());
```


<!-- ============ /docs/capabilities/server/post-data ============ -->

> source: https://developers.reddit.com/docs/capabilities/server/post-data

- 
- Saving Data
- Post data

# Post data

You can attach small amounts of data (2KB) to a post when creating it and update this data using the `postData` capability. This enables dynamic, stateful experiences available on posts without a server call. Post data is scoped to the post, not users.

Post data is useful for storing game state, scores, or any other information that needs to persist with the post and be shared across all users.

Post data is set when you submitPost and apps can access from the context object or do a server side call to update the post data on a Post object. For larger data, use redis.

note
Post data is sent to the client. Never store secrets or sensitive information.

## Creating posts with data

When creating a post, include the `postData` parameter with your custom data object.

- Hono
- Express
server/index.ts

```
import { context, reddit } from '@devvit/web/server';import type { JsonObject } from '@devvit/web/shared';type CreatePostResponse = { postId: string; message: string;};type ErrorResponse = { error: string;};app.post('/api/create-post', async (c) => { const { subredditName } = context; if (!subredditName) { return c.json({ error: 'Subreddit name is required' }, 400); } const postData: JsonObject = { challengeNumber: 42, totalGuesses: 0, gameState: 'active', pixels: [ [0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0], [0, 0, 0, 0, 2, 2, 1, 0, 0, 0, 0], [0, 0, 0, 2, 2, 1, 1, 1, 0, 0, 0], [0, 0, 2, 2, 1, 1, 1, 1, 1, 0, 0], [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0], [1, 1, 2, 2, 2, 2, 2, 2, 2, 1, 1], [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0], [0, 0, 2, 2, 1, 1, 1, 1, 1, 0, 0], [0, 0, 0, 2, 2, 1, 1, 1, 0, 0, 0], [0, 0, 0, 0, 2, 2, 1, 0, 0, 0, 0], [0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0] ], }; const post = await reddit.submitCustomPost({ subredditName, title: 'Post with custom data', entry: 'default', postData, }); return c.json({ postId: post.id, message: 'Post created successfully', });});
```

server/index.ts

```
import { context, reddit } from '@devvit/web/server';import type { JsonObject } from '@devvit/web/shared';type CreatePostResponse = { postId: string; message: string;};type ErrorResponse = { error: string;};router.post( '/api/create-post', async (_req, res) => { const { subredditName } = context; if (!subredditName) { return res.status(400).json({ error: 'Subreddit name is required' }); } const postData: JsonObject = { challengeNumber: 42, totalGuesses: 0, gameState: 'active', pixels: [ [0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0], [0, 0, 0, 0, 2, 2, 1, 0, 0, 0, 0], [0, 0, 0, 2, 2, 1, 1, 1, 0, 0, 0], [0, 0, 2, 2, 1, 1, 1, 1, 1, 0, 0], [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0], [1, 1, 2, 2, 2, 2, 2, 2, 2, 1, 1], [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0], [0, 0, 2, 2, 1, 1, 1, 1, 1, 0, 0], [0, 0, 0, 2, 2, 1, 1, 1, 0, 0, 0], [0, 0, 0, 0, 2, 2, 1, 0, 0, 0, 0], [0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0] ], }; const post = await reddit.submitCustomPost({ subredditName, title: 'Post with custom data', entry: 'default', postData, }); res.json({ postId: post.id, message: 'Post created successfully' }); },);
```

## Updating post data

To update post data after creation, fetch the post and use the `setPostData()` method.

- Hono
- Express
server/index.ts

```
import { context, reddit } from '@devvit/web/server';import type { JsonObject } from '@devvit/web/shared';type UpdatePostDataRequest = { favoriteColor?: string; username?: string;};type UpdatePostDataResponse = { success: true; message: string;};type ErrorResponse = { error: string;};app.post('/api/update-post-data', async (c) => { const { postId } = context; const { favoriteColor, username } = await c.req.json(); if (!postId) { return c.json({ error: 'Post ID is required' }, 400); } try { const post = await reddit.getPostById(postId); // Get existing post data to merge with updates const currentData = (context.postData || {}) as JsonObject; await post.setPostData({ ...currentData, favoriteColor: favoriteColor || 'unknown', lastUpdatedBy: username || 'anonymous', lastUpdatedAt: new Date().toISOString(), }); return c.json({ success: true, message: 'Post data updated successfully', }); } catch (error) { console.error('Error updating post data:', error); return c.json({ error: 'Failed to update post data' }, 500); }});
```

server/index.ts

```
import { context, reddit } from '@devvit/web/server';import type { JsonObject } from '@devvit/web/shared';type UpdatePostDataRequest = { favoriteColor?: string; username?: string;};type UpdatePostDataResponse = { success: true; message: string;};type ErrorResponse = { error: string;};router.post( '/api/update-post-data', async (req, res) => { const { postId } = context; const { favoriteColor, username } = req.body; if (!postId) { return res.status(400).json({ error: 'Post ID is required' }); } try { const post = await reddit.getPostById(postId); // Get existing post data to merge with updates const currentData = (context.postData || {}) as JsonObject; await post.setPostData({ ...currentData, favoriteColor: favoriteColor || 'unknown', lastUpdatedBy: username || 'anonymous', lastUpdatedAt: new Date().toISOString(), }); res.json({ success: true, message: 'Post data updated successfully' }); } catch (error) { console.error('Error updating post data:', error); res.status(500).json({ error: 'Failed to update post data' }); } },);
```

warning
`setPostData()` replaces the entire post data object. To update specific fields while preserving others, merge the existing data with your updates.

## Accessing post data

Post data is available through `context.postData` in both client and server contexts.

client/index.tsx

```
import { context } from '@devvit/web/client';export const App = () => { return ( Post Data:
{JSON.stringify(context.postData, null, 2) ?? 'undefined'} 
);}
```

## Limitations

Post data supports:

- JSON-serializable objects only

- Maximum size of 2KB

- Data persists with the post lifecycle (deleted when post is deleted)

- Updates to post data don't trigger automatic re-renders. Implement polling or refresh mechanisms as needed


<!-- ============ /docs/capabilities/server/http-fetch ============ -->

> source: https://developers.reddit.com/docs/capabilities/server/http-fetch

- 
- Access External Endpoints
- HTTP Fetch

# HTTP Fetch

Make requests to allow-listed external domains.

Your Devvit app can make network requests to access allow-listed external domains using HTTP Fetch. This enables your app to leverage webhooks, personal servers, and other third-party integrations asynchronously across the network.

## Enabling HTTP fetch calls

devvit.json

```
{ ... "permissions": { "http": { "enable": true, "domains": ["my-site.com", "another-domain.net"] } }}
```

### Requesting a domain to be allow-listed

Apps may request a domain to be added to the allow-list by specifying `domains` in the `http` configuration.
This configuration is optional, and apps can still configure `http: true` as before.

Requested domains will be submitted for review when you playtest or upload your app. Admins may approve or deny domain requests.

Domain entries must be exact hostnames only, such as nytimes.com or wikipedia.org. These fetch requests are not allowed:

- Be specific. No using `*.example.com` when you need `api.example.com`

- No wildcards: `*.example.com`

- No protocols: `https://api.example.com`

- No paths: `api.example.com/webhooks`

Domains that are approved for your app will be displayed in the Developer Settings section for your app at `https://developers.reddit.com/apps/{your-app-slug}/developer-settings`.
These domains are allow-listed for your app only and not globally.

Apps must request each individual domain that it intends to fetch, even if the domain is already globally allowed. See the global fetch allowlist to view the list of globally allowed domains.

## Limitations

- Access is only allowed to https URIs.

- Supported HTTP methods: `GET`, `POST`, `PUT`, `DELETE`, `OPTIONS` and `PATCH`.

- HTTP timeout limit is 30 seconds.

## Example usage

Devvit Web applications have two different contexts for using fetch:

### Server-side fetch

Server-side fetch allows your app to make HTTP requests to allowlisted external domains from your server-side code (e.g., API routes, server actions):

server/index.ts

```
const response = await fetch('https://example.com/api/data', { method: 'GET', headers: { 'Content-Type': 'application/json', },});const data = await response.json();console.log('External API response:', data);
```

### Client-side fetch

Client-side fetch has different restrictions and can only make requests to your own webview domain:

Client-side restrictions:

- Domain limitation: Can only make requests to your own webview domain

- Endpoint requirement: All requests must target endpoints that end with `/api`

- Authentication: Handled automatically - no need to manage auth tokens

- No external domains: Cannot make requests to external domains from client-side code

client/index.ts

```
const handleFetchData = async () => { // Correct: fetching your own webview's API endpoint const response = await fetch("/api/user-data", { method: "GET", headers: { "Content-Type": "application/json", }, }); const data = await response.json(); console.log("API response:", data);};// Incorrect: cannot fetch external domains from client-side// const response = await fetch('https://external-api.com/data');// Incorrect: endpoint must end with /api// const response = await fetch('/user-data');
```

## Troubleshooting

If you see the following error, it means HTTP Fetch requests are hitting the internal timeout limits. To resolve this:

- Use a queue or kick off an async request in your back end. You can use Scheduler to monitor the result.

- Optimize the overall HTTP request latency if you have a self-hosted server.

```
HTTP request to domain: timed out with error: context deadline exceeded.
```

### Terms and conditions

Any app that uses `fetch` must upload Terms and Conditions and a Privacy Policy. Links to each of these documents must be saved in the app details form.

## Global fetch allowlist

The following domains are globally allowed and can be fetched by any app:

- example.com

- site.api.espn.com

- cdn.espn.com

- discord.com

- api.polygon.io

- api.massive.com

- polygon.io

- slack.com

- lichess.org

- api.telegram.org

- commentanalyzer.googleapis.com

- language.googleapis.com

- statsapi.mlb.com

- api.openai.com

- api.scryfall.com

- api.nasa.gov

- api.sportradar.us

- api.sportradar.com

- random.org

- generativelanguage.googleapis.com

- youtube.googleapis.com

- api.weather.gov

- wikipedia.org

- finance.yahoo.com

- api.twitter.com

- api.petfinder.com

- fonts.googleapis.com

- nytimes.com

- npr.org

- propublica.org

- pbs.org

- i.giphy.com

- chessboardjs.com


<!-- ============ /docs/capabilities/server/http-fetch-policy ============ -->

> source: https://developers.reddit.com/docs/capabilities/server/http-fetch-policy

- 
- Access External Endpoints
- HTTP Fetch Policy

# HTTP Fetch Policy

When requesting domains to be allow-listed, they fall into three categories:

- 
APIs that provide data or specific services (e.g., `api.openai.com`, `api.wikipedia.org`) - These will be approved if they have a publicly documented and publicly accessible API for valid use cases, and if they adhere to the Devvit rules. Please reference our AI providers and account linking policies for common invalid use cases.

- 
Limited scope cloud providers (e.g., `username.supabase.com`, `my-app.firebase.com`) - May be granted with exceptions. You must:

- Follow user privacy guidelines and data governance requirements

- Use an approved provider from the list below (please include your subdomain, and request for the most granular domain possible, e.g. `my-app.s3.amazonaws.com`)

- `supabase.com`

- `firebase.com`

- `spacetimedb.com`

- `s3.amazonaws.com`

- `storage.googleapis.com`

- Demonstrate a capability that `@devvit/server` doesn't support

- Valid use cases include:

- Asset hosting (videos, images, music)

- Relational databases

- Note: Approval can be revoked at any time

- 
Personal domains (e.g., `personaldomain.com`) - Will not be approved. If you have a use case that our Devvit server does not support, please submit your request with detailed justification.

### AI providers

At this time, the only AI providers we allow are OpenAI and Google Gemini:

- `api.openai.com`

- `generativelanguage.googleapis.com`

Requests to use any other AI provider will be denied.

### Documentation requirements

If your app uses fetch domains, you must add context to your app's README for the approval process:

- Create a "Fetch Domains" section in your README

- List each domain you're requesting and explain why you need it

- Ensure your usage complies with our fetch guidelines

Example README section:

```
## Fetch DomainsThe following domains are requested for this app:- `api.wikipedia.org` - Used to fetch article summaries for the knowledge base feature- `username.supabase.com` - Required for relational database storage of user preferences (Devvit KV store doesn't support complex queries needed for this feature)
```

….

### Domain Requirements

Domain entries must be exact hostnames only, such as nytimes.com or wikipedia.org. These fetch requests are not allowed:

- Be specific. No using `*.example.com` when you need `api.example.com`

- No wildcards: `*.example.com`

- No protocols: `https://api.example.com`

- No paths: `api.example.com/webhooks`

Domains that are approved for your app will be displayed in the Developer Settings section for your app at `https://developers.reddit.com/apps/{your-app-slug}/developer-settings`.
These domains are allow-listed for your app only and not globally.

Apps must request each individual domain that it intends to fetch, even if the domain is already globally allowed. See the global fetch allowlist to view the list of globally allowed domains.

### Terms and conditions

Any app that uses `fetch` must upload Terms and Conditions and a Privacy Policy. Links to each of these documents must be saved in the app details form.

## Global fetch allowlist

The following domains are globally allowed and can be fetched by any app:

- api.openai.com

- generativelanguage.googleapis.com

- example.com

- site.api.espn.com

- cdn.espn.com

- discord.com

- api.polygon.io

- api.massive.com

- polygon.io

- slack.com

- lichess.org

- api.telegram.org

- commentanalyzer.googleapis.com

- language.googleapis.com

- statsapi.mlb.com

- api.scryfall.com

- api.nasa.gov

- api.sportradar.us

- api.sportradar.com

- random.org

- youtube.googleapis.com

- api.weather.gov

- wikipedia.org

- finance.yahoo.com

- api.twitter.com

- api.petfinder.com

- fonts.googleapis.com

- nytimes.com

- npr.org

- propublica.org

- pbs.org

- i.giphy.com

- chessboardjs.com


<!-- ============ /docs/capabilities/server/settings-and-secrets ============ -->

> source: https://developers.reddit.com/docs/capabilities/server/settings-and-secrets

- 
- Post Creation & Navigation
- Settings and Secrets

# Settings and Secrets

Configure your app with settings that can be customized per subreddit or globally across all installations. Settings allow moderators to customize app behavior for their subreddit, while secrets enable secure storage of sensitive data like API keys.

Settings come in two scopes:

- Subreddit settings: Configurable by moderators for each installation

- Global settings & Secrets: Set by developers and shared across all installations

warning
Local environment variables and `.env` files are read during playtesting only.

## Defining settings

Define settings in your `devvit.json` file under the `settings` object. Settings are organized by scope: `global` for app-wide settings and secrets, `subreddit` for installation-specific settings.

devvit.json

```
{ "settings": { "global": { "apiKey": { "type": "string", "label": "API Key", "defaultValue": "", "isSecret": true }, "environment": { "type": "select", "label": "Environment", "options": [ { "label": "Production", "value": "production" }, { "label": "Development", "value": "development" } ], "defaultValue": "production" } }, "subreddit": { "welcomeMessage": { "type": "string", "label": "Welcome Message", "validationEndpoint": "/internal/settings/validate-message", "defaultValue": "Welcome to our community!" }, "enabledFeatures": { "type": "multiSelect", "label": "Enabled Features", "options": [ { "label": "Auto-moderation", "value": "automod" }, { "label": "Welcome posts", "value": "welcome" }, { "label": "Statistics tracking", "value": "stats" } ], "defaultValue": ["welcome"] } } }}
```

note
After defining settings in `devvit.json`, you must build your app (`npm run dev`) before you can set secrets via the CLI.

## Setting types

The following setting types are supported:

- string: Text input field

- boolean: Toggle switch

- number: Numeric input

- select: Dropdown selection (single choice)

- multiSelect: Multiple choice dropdown

## Managing secrets

Secrets are global settings marked with `isSecret: true`. They're encrypted and can only be set by developers via the CLI.

### Listing secrets

View all defined secrets in your app:

```
npx devvit settings listKey Label Is this a secret? Type────────── ─────────── ───────────────── ──────apiKey API Key true STRINGenvironment Environment false SELECT
```

### Setting secret values

Only app developers can set secret values:

```
npx devvit settings set apiKey? Enter the value you would like to assign to the variable apiKey: Updating app settings... ✅Successfully added app settings for apiKey!
```

warning
At least one app installation is required before you can store secrets via the CLI. Run `npm run dev` to start your first installation.

## Accessing settings in your app

Settings can be retrieved from within your app.

- Hono
- Express
server/index.ts

```
import { settings } from '@devvit/web/server';type ProcessResponse = { success: true };// Get a single settingconst apiKey = await settings.get('apiKey');// Get multiple settingsconst [welcomeMessage, features] = await Promise.all([ settings.get('welcomeMessage'), settings.get('enabledFeatures')]);// Use in an endpointapp.post('/api/process', async (c) => { const apiKey = await settings.get('apiKey'); const environment = await settings.get('environment'); const response = await fetch('https://api.example.com/endpoint', { headers: { 'Authorization': `Bearer ${apiKey}`, 'X-Environment': environment } }); return c.json({ success: true });});
```

server/index.ts

```
import { settings } from '@devvit/web/server';type ProcessResponse = { success: true };// Get a single settingconst apiKey = await settings.get('apiKey');// Get multiple settingsconst [welcomeMessage, features] = await Promise.all([ settings.get('welcomeMessage'), settings.get('enabledFeatures')]);// Use in an endpointrouter.post('/api/process', async (req, res) => { const apiKey = await settings.get('apiKey'); const environment = await settings.get('environment'); const response = await fetch('https://api.example.com/endpoint', { headers: { 'Authorization': `Bearer ${apiKey}`, 'X-Environment': environment } }); res.json({ success: true });});
```

## Input validation

Validate user input to ensure it meets your requirements before saving. Define a validation endpoint in your `devvit.json` and implement it in your server:

devvit.json

```
{ "settings": { "subreddit": { "minimumAge": { "type": "number", "label": "Minimum Account Age (days)", "validationEndpoint": "/internal/settings/validate-age", "defaultValue": 7 } } }}
```

- Hono
- Express
server/index.ts

```
import type { SettingsValidationRequest, SettingsValidationResponse } from '@devvit/web/shared';app.post('/internal/settings/validate-age', async (c) => { const { value } = await c.req.json>(); if (!value || value ({ success: false, error: 'Age must be a positive number', }); } if (value > 365) { return c.json({ success: false, error: 'Maximum age is 365 days', }); } return c.json({ success: true });});
```

server/index.ts

```
import type { SettingsValidationRequest, SettingsValidationResponse } from '@devvit/web/shared';router.post>( '/internal/settings/validate-age', async (req, res): Promise => { const { value } = req.body; if (!value || value 365) { res.json({ success: false, error: 'Maximum age is 365 days', }); return; } res.json({ success: true }); });
```

## Subreddit settings UI

Once your app is installed, moderators can configure subreddit settings through the Install Settings page. These settings are scoped to the specific subreddit where the app is installed.

Moderators will see all non-secret settings defined for the subreddit scope and can update them as needed. Changes are saved immediately and available to your app.

## Complete example

Here's a complete example showing both secrets and subreddit settings in action:

devvit.json

```
{ "settings": { "global": { "openaiApiKey": { "type": "string", "label": "OpenAI API Key", "isSecret": true, "defaultValue": "" } }, "subreddit": { "aiModel": { "type": "select", "label": "AI Model", "options": [ { "label": "GPT-4", "value": "gpt-4" }, { "label": "GPT-3.5", "value": "gpt-3.5-turbo" } ], "defaultValue": "gpt-3.5-turbo" }, "maxTokens": { "type": "number", "label": "Max Response Tokens", "validationEndpoint": "/internal/settings/validate-tokens", "defaultValue": 150 } } }}
```

- Hono
- Express
server/index.ts

```
import type { JsonObject, JsonValue } from '@devvit/web/shared';import { settings } from '@devvit/web/server';type GenerateRequest = { messages: JsonValue };type GenerateResponse = JsonObject;app.post('/api/generate', async (c) => { const [apiKey, model, maxTokens] = await Promise.all([ settings.get('openaiApiKey'), settings.get('aiModel'), settings.get('maxTokens') ]); const { messages } = await c.req.json(); const response = await fetch('https://api.openai.com/v1/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}`, }, body: JSON.stringify({ model, max_tokens: maxTokens, messages, }), }); const data = (await response.json()) as GenerateResponse; return c.json(data);});
```

server/index.ts

```
import type { JsonObject, JsonValue } from '@devvit/web/shared';import { settings } from '@devvit/web/server';type GenerateRequest = { messages: JsonValue };type GenerateResponse = JsonObject;router.post('/api/generate', async (req, res) => { const [apiKey, model, maxTokens] = await Promise.all([ settings.get('openaiApiKey'), settings.get('aiModel'), settings.get('maxTokens') ]); const response = await fetch('https://api.openai.com/v1/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}`, }, body: JSON.stringify({ model, max_tokens: maxTokens, messages: req.body.messages, }), }); const data = (await response.json()) as GenerateResponse; res.json(data);});
```

## Limitations

- Secrets can only be global

- Secrets can only be set via CLI by app developers

- Setting values are currently not fully surfaced in the CLI

- Maximum of 2KB per setting value


<!-- ============ /docs/capabilities/server/media-uploads ============ -->

> source: https://developers.reddit.com/docs/capabilities/server/media-uploads

- 
- User Input
- Media Uploads

# Media Uploads

warning
Apps can only display media hosted on Reddit

You can upload media to Reddit at runtime using the `media` capability. This is different than static images, which you bundle with your app's client assets.

Runtime media is useful for embedding media in RTJSON (Posts and Comments) as well as displaying it within an interactive post app.

## Enabling media uploads

Enable the `media` permission in your `devvit.json` file.

devvit.json

```
{ "permissions": { "media": true }}
```

## Media uploads

On the server, pass a remote URL or data URL to `media.upload()` to upload an image, GIF, or video and get a Reddit-hosted asset you can safely render in posts, comments, and rich text.

### Response type

`media.upload()` returns:

```
type MediaAsset = { mediaId: string; mediaUrl: string;};
```

- `mediaId`: Reddit media asset ID.

- `mediaUrl`: Reddit CDN URL (use this in rich text or UI).

### media.upload() input

`media.upload()` expects an object with:

- `url`: The media URL (remote URL or data URL).

- `type`: The media kind (`'image'`, `'gif'`, or `'video'`).

```
type UploadMediaOptions = { url: string; // remote URL or data URL type: 'image' | 'gif' | 'video';};
```

Use `type: 'image'` for PNG, JPEG, and WEBP uploads.

### Basic server usage

server/index.ts

```
import { media } from '@devvit/web/server';const uploaded = await media.upload({ url: 'https://example.com/my-image.png', type: 'image',});// uploaded.mediaId// uploaded.mediaUrl
```

### Example: API endpoint returning upload response

server/index.ts

```
import { media } from '@devvit/web/server';app.post('/api/upload', async (c) => { const { url, type } = await c.req.json(); const uploaded = await media.upload({ url, type }); return c.json({ mediaId: uploaded.mediaId, mediaUrl: uploaded.mediaUrl, });});
```

### Example: submit a post with uploaded media using RichTextBuilder

server/index.ts

```
import { media } from '@devvit/web/server';import { reddit, RichTextBuilder } from '@devvit/reddit';const uploaded = await media.upload({ url: 'https://example.com/cover.png', type: 'image',});const richtext = new RichTextBuilder() .paragraph((p) => { p.text({ text: 'Uploaded image:' }); }) .paragraph((p) => { p.image({ mediaUrl: uploaded.mediaUrl, caption: 'Rendered from media.upload()', }); });await reddit.submitPost({ subredditName: 'my_subreddit', title: 'Post with uploaded media', richtext,});
```

### Example: submit a comment with uploaded media using RichTextBuilder

server/index.ts

```
import { media } from '@devvit/web/server';import { reddit, RichTextBuilder } from '@devvit/reddit';// Parent can be a post id (t3_...) or comment id (t1_...)const parentId = 't3_abc123';const uploaded = await media.upload({ url: 'https://example.com/reply-image.png', type: 'image',});const commentRichtext = new RichTextBuilder() .paragraph((p) => { p.text({ text: 'Here is the image:' }); }) .paragraph((p) => { p.image({ mediaUrl: uploaded.mediaUrl }); });await reddit.submitComment({ id: parentId, richtext: commentRichtext,});
```

### Example: raw RTJSON (without RichTextBuilder)

If you prefer raw RTJSON, pass an object directly to `richtext`:

server/index.ts

```
import { media } from '@devvit/web/server';import { reddit } from '@devvit/reddit';const uploaded = await media.upload({ url: 'https://example.com/raw-rtjson.png', type: 'image',});await reddit.submitComment({ id: 't3_abc123', richtext: { document: [ { e: 'par', c: [{ e: 'text', t: 'Raw RTJSON image:' }], }, { e: 'par', c: [{ e: 'img', mediaUrl: uploaded.mediaUrl, c: 'RTJSON image node' }], }, ], },});
```

## Canvas screenshots

The Canvas API is fully supported by Devvit. You can use it to capture screenshots of your app's current state and upload them using the media API.

This is useful for letting users share their progress, achievements, or creations as image posts. Sharing screenshots is an effective way to build community engagement and increase visibility for your app.

client/screenshot.ts

```
// Capture the canvas as a data URLconst canvas = document.querySelector('canvas');const dataUrl = canvas.toDataURL('image/png');// Send to server endpoint for uploadconst response = await fetch('/api/upload-screenshot', { method: 'POST', body: JSON.stringify({ image: dataUrl }),});
```

server/index.ts

```
import { media } from '@devvit/web/server';app.post('/api/upload-screenshot', async (c) => { const { image } = await c.req.json(); const response = await media.upload({ url: image, // data URL from canvas type: 'image', }); return c.json({ url: response.mediaUrl });});
```

## Notes and limits

- Supported image upload formats: PNG, JPEG, WEBP, and GIF.

- Maximum upload size: 20 MB.

- WEBP uploads may be converted to JPEG in the returned Reddit URL.


<!-- ============ /docs/capabilities/server/text_fallback ============ -->

> source: https://developers.reddit.com/docs/capabilities/server/text_fallback

- 
- Best Practices
- Text Fallback

# Text Fallback

Text fallback lets you specify alternative text content for your interactive post, enabling:

- Old Reddit and third-party app support - These platforms cannot render interactive posts

- Google (SEO) and Reddit Answers indexing - Critical for discoverability and growth

- AutoModerator rule compatibility - Allows mod rules to process your post content

- Reddit safety checks and filters - Enables content moderation systems to work properly

- Custom post thumbnail - Link to an image to generate a thumbnail

Text fallback uses Markdown formatting and allows for up to 40,000 characters.

## Reddit API

The text fallback is only available when using the Reddit API to create a post.

devvit.json

```
{ "permissions": { "reddit": true }}
```

## Use a text string

```
import { reddit } from '@devvit/web/server';const post = await reddit.submitCustomPost({ title: 'Text String', subredditName: subreddit.name, textFallback: { text: 'You can read this text string on oldreddit because you used textFallback' }, entry: 'default',});
```

Result

## Use a text string with markdown

```
import { reddit } from '@devvit/web/server';const post = await reddit.submitCustomPost({ title: 'Text string with markdown', subredditName: subreddit.name, textFallback: { text: 'You can read this _text string with markdown_ on oldreddit because you used **textFallback**', }, entry: 'default',});
```

Result

## Use rich text

```
import { reddit } from '@devvit/web/server';const textFallbackRichtext = new RichTextBuilder() .heading({ level: 1 }, (h) => { h.rawText('Yay for text fallbacks!'); }) .codeBlock({}, (cb) => cb.rawText('You can read this rich text on old.reddit because you used textFallback'));const post = await reddit.submitCustomPost({ title: 'Rich Text', subredditName: subreddit.name, textFallback: { richtext: textFallbackRichtext }, entry: 'default',});
```

Result

## Update a post’s text fallback

The post author can edit and update text fallback content after it’s been created. To do this, call post.setTextFallback with the desired fallback content.

```
import { reddit } from '@devvit/web/server';// from a menu action, form, scheduler, trigger, custom post click event, etcconst newTextFallback = { text: 'This is an updated text fallback' };const post = await reddit.getPostById(context.postId);await post.setTextFallback(newTextFallback);
```


================================================================================
# Launch screen & entry points
================================================================================



<!-- ============ /docs/capabilities/server/launch_screen_and_entry_points/launch_overview ============ -->

> source: https://developers.reddit.com/docs/capabilities/server/launch_screen_and_entry_points/launch_overview

- 
- Post Creation & Navigation
- Launch Screen
- View Modes, Launch Screens, and Entry Points

# View Modes, Launch Screens, and Entry Points

Devvit’s interactive framework gives you powerful ways to shape how users experience apps, from launch screen to expanded screen viewing. With view modes, HTML-based launch screens, and multiple entry points, you can design apps that feel native and respond to how users interact across the Reddit platform.

View modes define how your app appears:

- 
Inline mode loads your app’s web view directly inside the post unit, either in the feed or on the post details page. Users can interact immediately without additional taps or page loads.

- 
Expanded mode opens your app or game in a larger, full-screen view, ideal for immersive experiences such as games, creative tools, or detailed interactions on mobile.

Launch screens are the first thing users see before your main app loads. These HTML-based screens give you complete control over their design, animation, and loading behavior using the same tools and styles as your app itself.

This is an example of an inline launch screen:

Entry points act as a router that organizes your app across different view modes. Each entry point specifies the initial HTML file for the specific context. A user might experience your app inline, when it’s embedded in a post, or launch it in expanded mode for a larger, full-screen mobile experience.


<!-- ============ /docs/capabilities/server/launch_screen_and_entry_points/launch_screen_customization ============ -->

> source: https://developers.reddit.com/docs/capabilities/server/launch_screen_and_entry_points/launch_screen_customization

- 
- Post Creation & Navigation
- Launch Screen
- Launch Screen Customization

# Launch Screen Customization

## Creating Your Launch (Preview) Screen

Create an HTML file that serves as your app's launch screen in inline mode. This is what users see immediately when they encounter your post. Templates include a performant and compliant preview screen.

preview.html

```
My Game Adventure Game Tap to play in fullscreen
Play Now 

```

preview.js

```
import { requestExpandedMode } from '@devvit/web/client';document.addEventListener('DOMContentLoaded', () => { const playButton = document.getElementById('play-button'); playButton.addEventListener('click', async (event) => { try { await requestExpandedMode(event, 'game'); } catch (error) { console.error('Failed to enter expanded mode:', error); } });});
```

## API Reference

### requestExpandedMode()

Requests expanded mode for the web view. This displays the web view in a larger modal presentation on web and full screen on mobile.

```
import { requestExpandedMode } from '@devvit/web/client';// Must be called from a trusted event (click, touch, etc.)await requestExpandedMode(event, 'game');
```

Parameters

- `event` (PointerEvent): The gesture that triggered the request, must be a trusted event

- `entry` (string): The destination URI name (e.g., `splash` or `game`). Entry names are the `devvit.json post.entrypoints` keys

### getWebViewMode()

Get the current web view mode state.

```
import { getWebViewMode } from '@devvit/web/client';const currentMode = getWebViewMode(); // Returns 'inline' | 'expanded'if (currentMode === 'expanded') { // Show expanded UI} else { // Show inline UI}
```

### Mode Change Events

Listen for mode changes to update your UI.

```
import { addWebViewModeListener, removeWebViewModeListener } from '@devvit/web/client';function useWebViewMode() { const [mode, setMode] = useState(getWebViewMode()); useEffect(() => { const handleModeChange = (newMode: 'inline' | 'expanded') => { setMode(newMode); }; addWebViewModeListener(handleModeChange); return () => removeWebViewModeListener(handleModeChange); }, []); return mode;}
```

## Complete Example

game.tsx

```
import React, { useState, useEffect } from 'react';import { getWebViewMode, requestExpandedMode, exitExpandedMode, addWebViewModeListener, removeWebViewModeListener,} from '@devvit/web/client';export function GameApp() { const [mode, setMode] = useState(getWebViewMode()); const [gameStarted, setGameStarted] = useState(false); useEffect(() => { const handleModeChange = (newMode: 'inline' | 'expanded') => { setMode(newMode); // Pause game when exiting expanded mode if (newMode === 'inline' && gameStarted) { pauseGame(); } }; addWebViewModeListener(handleModeChange); return () => removeWebViewModeListener(handleModeChange); }, [gameStarted]); const handlePlayClick = async (event: React.MouseEvent) => { try { await requestExpandedMode(event.nativeEvent, 'game'); setGameStarted(true); } catch (error) { console.error('Could not enter expanded mode:', error); // Fallback: start game inline setGameStarted(true); } }; const handleExitClick = async (event: React.MouseEvent) => { try { await exitExpandedMode(event.nativeEvent); } catch (error) { console.error('Could not exit expanded mode:', error); } }; if (mode === 'inline') { return ( Adventure Game Tap to play in fullscreen
Play Now 
); } return ( Exit 
);}
```


<!-- ============ /docs/capabilities/server/launch_screen_and_entry_points/view_modes_entry_points ============ -->

> source: https://developers.reddit.com/docs/capabilities/server/launch_screen_and_entry_points/view_modes_entry_points

- 
- Post Creation & Navigation
- Setting up view modes and entry points

# Setting up view modes and entry points

## View modes

Devvit apps support two view modes:

Inline Mode

- What it is: Your app loads directly within the post unit

- User experience: Users see your app content immediately without clicking

- Use case: Preview screens, game menus, leaderboards, or any content that works well in a post-sized container

- Requirements: Only respond to taps and clicks, load quickly, and respect post boundaries

Expanded Mode

- What it is: Your app displays in a larger modal (web) or full screen (mobile)

- User experience: Users click to enter a dedicated experience

- Use case: Full games, longer load times, detailed interfaces, or any content that needs more space or full gesture support

- Trigger: User-initiated only (button click, gesture, etc.)

## Multiple entry points

Multiple entry points let the user start the game from different contexts or states. For example, you can have a button that launches into a leaderboard view and another for a specific game mode, each of these would be configured as an entry point for your app. Define multiple entry points in your `devvit.json`. If you use the Devvit Vite plugin, it automatically infers the client build inputs from these entrypoints, so you don't need to maintain a custom Rollup `input` list.

devvit.json

```
{ "post": { "dir": "dist/client", "entrypoints": { "default": { "entry": "src/client/preview.html", "height": "regular", "inline": true }, "game": { "entry": "src/client/game.html" }, "leaderboard": { "entry": "src/client/leaderboard.html" } } }}
```

vite.config.ts

```
import { defineConfig } from "vite";import react from "@vitejs/plugin-react";import tailwind from "@tailwindcss/vite";import { devvit } from "@devvit/start/vite";export default defineConfig({ plugins: [react(), tailwind(), devvit()],});
```

File Structure Example

```
your-app/├── devvit.json├── vite.config.ts├── src/│ ├── server/│ │ └── index.ts│ └── client/│ ├── preview.html│ ├── game.html│ ├── leaderboard.html│ └── styles.css└── dist/ // Built files after compilation └── client/ // This is what "dir" points to ├── preview.html ├── game.html ├── leaderboard.html └── styles.css
```

The `dir` property specifies where your built client files are located. With the Devvit Vite plugin, the `entry` values point at your source HTML files (for example `src/client/preview.html`), and the plugin outputs the matching files into `dist/client` during `vite build`.

### Creating posts with specific entry points

Use the `entry` parameter when creating posts to specify which entry point from your `devvit.json` configuration to use. The entry value must match one of the keys defined in `post.entrypoints`.

server/index.ts

```
import { reddit } from '@devvit/web/server';// Create a post using the default entrypointasync function createDefaultPost(context: any) { return await reddit.submitCustomPost({ subredditName: context.subredditName!, title: 'Adventure Game', entry: 'default', postData: { gameState: 'menu', }, });}// Create a post using a specific entrypointasync function createGamePost(context: any) { return await reddit.submitCustomPost({ subredditName: context.subredditName!, title: 'Adventure Game', entry: 'game', // Must match a key in devvit.json entrypoints postData: { gameState: 'active', initialized: true, }, });}
```

How it works

- If `entry` is not specified, the `default` entry point is used automatically.

- The `entry` value must match a key defined in your `devvit.json post.entrypoints` object.

- Each entry point can have its own HTML file and height setting.

- Invalid entry point names will cause an error.

### Switching between view modes

You can transition from inline mode to expanded mode with a different entry point, like this:

```
import { requestExpandedMode } from '@devvit/web/client';// Switch to the 'game' entrypoint in expanded modeconst handleStartGame = async (event: React.MouseEvent) => { try { await requestExpandedMode(event.nativeEvent, 'game'); } catch (error) { console.error('Failed to enter expanded mode:', error); }};
```

## Inline mode requirements

All Devvit web view apps load in inline mode by default. Your app loads directly in the post unit without requiring users to click to expand.

Apps must meet these requirements for approval and featuring:

- Performance

- Optimize for mobile devices and slower connections

- Load initial content in under 1 second

- Achieve a Lighthouse score >80.

- To find your Lighthouse score you can follow these steps:

- Open your inline post

- Open Developer Tools in Chrome and navigate to the elements tab

- Find the Devvit web view element in the DOM and open it in a new tab

- Open Developer Tools in the new tab and navigate to Lighthouse

- Ensure you have mobile selected and select Analyze Page Load

- Gesture compliance

- Only tap or click input is allowed

- No scroll traps or scroll hijacking

- No zoom or pan interference

- Users must be able to scroll past your post naturally

- Responsive design

- Content must work across all viewport sizes (use chrome devtools to test your app's responsiveness)

- Keep in mind that the majority of users are on mobile devices

- User-initiated expanded mode

- Apps cannot auto-launch into expanded mode or auto-close without a user action

- Must have explicit user interaction (clearly labeled button or action)

- Default view should respect standard post boundaries

- Safe use of sound

- Audio should not play unless there is a user interaction

- Include a button to mute in your game

- Use the visibilityChange handler to mute any sounds if a user scrolls away


================================================================================
# Client capabilities (UI)
================================================================================



<!-- ============ /docs/capabilities/client/overview ============ -->

> source: https://developers.reddit.com/docs/capabilities/client/overview

- 
- Devvit Setup Overview
- Client Overview

# Client Overview

Client-side effects enable your Devvit app to provide interactive feedback and navigation to users. These effects include showing toasts, displaying forms, navigating to different pages, and more.

Import client functions from `@devvit/web/client`:

client/index.ts

```
import { showToast, showForm, navigateTo } from '@devvit/web/client';// Show a toast notificationshowToast('Hello from Devvit Web!');// Navigate to a URLnavigateTo('https://www.reddit.com/r/webdev');// Show a form and handle responseconst result = await showForm({ form: { fields: [ { type: 'string', name: 'username', label: 'Username' } ] }});if (result) { console.log('Form submitted:', result.username);}
```

## Available client effects

EffectDescriptionAPIToastShow temporary notification messages`showToast()`FormDisplay interactive forms with promise-based responses`showForm()`NavigationRedirect to Reddit content or external URLs`navigateTo()`

:::note When to use client library functions
You should only use client library functions in response to a user-initiated action.
:::

## Menu responses

Menu items can respond with client effects after server processing.

Menu responses allow you to:

- Process data on the server before showing client effects

- Chain multiple forms together in complex workflows

- Validate user permissions before allowing actions

- Fetch external data to populate forms or display results

For complete details and examples, see the Menu Actions documentation.

## Next steps

Explore the specific documentation for each client effect:

- Toasts - Temporary notification messages

- Forms - Interactive user input

- Navigation - Redirecting users

- Realtime - Live updates and communication


<!-- ============ /docs/capabilities/client/forms ============ -->

> source: https://developers.reddit.com/docs/capabilities/client/forms

- 
- User Input
- Forms

# Forms

A form lets your app ask users to input and submit data. Forms can be defined with a simple form object that takes a list of fields, and return user responses directly as promises.

## Using forms

Promise-based forms:

client/index.ts

```
import { showForm } from '@devvit/web/client';// Show form and get user response directlyconst result = await showForm({ form: { fields: [ { type: 'string', name: 'name', label: 'Name', }, ], }, data: { name: 'Default value' } // Optional initial data});// Handle form submission result immediatelyif (result) { const { name } = result; // Process the data directly console.log(`User entered: ${name}`); // Chain additional actions await fetch('/api/save-name', { method: 'POST', body: JSON.stringify({ name }) }); // Or show another form in sequence const step2 = await showForm({ form: { fields: [ { type: 'string', name: 'food', label: 'Favorite food?', }, ], } }); if (step2) { console.log(`Multi-step complete: ${name}, ${step2.food}`); }} else { console.log('User cancelled the form');}
```

### Parameters

`showForm(options)` → Returns Promise

- `form` (Form): The form specification object

- `data` (FormValues, optional): Initial form field values

- Returns: `Promise<FormValues | null>` - Resolves with form data or null if cancelled

## Menu response forms

For forms that open from a menu item, you can use menu responses. This is useful since you do not have access to the `@devvit/web/client` library from a menu item endpoint.

Configure forms in devvit.json:

devvit.json

```
{ "forms": { "nameForm": "/internal/form/name-submit", "reviewForm": "/internal/form/review-submit" }}
```

Server endpoint that shows form via menu response:

- Hono
- Express
server/index.ts

```
import type { MenuItemRequest, UiResponse } from '@devvit/web/shared';type NameFormRequest = { name: string };type ReviewFormRequest = { review: string };// Menu action that triggers menu response formapp.post('/internal/menu/start-workflow', async (c) => { const _input = await c.req.json(); // Server processing before showing form const userData = await fetchUserData(); return c.json({ showForm: { name: 'nameForm', form: { fields: [ { type: 'string', name: 'name', label: 'Name', }, ], }, data: { name: userData.name } // Pre-populate from server } });});// Form submission handler that can chain to another formapp.post('/internal/form/name-submit', async (c) => { const { name } = await c.req.json(); // Server processing await saveUserName(name); // Show next form in workflow return c.json({ showForm: { name: 'reviewForm', form: { fields: [ { type: 'paragraph', name: 'review', label: 'How was your experience?', }, ], } } });});app.post('/internal/form/review-submit', async (c) => { const { review } = await c.req.json(); await saveReview(review); return c.json({ showToast: 'Thank you for your feedback!' });});
```

server/index.ts

```
import type { MenuItemRequest, UiResponse } from '@devvit/web/shared';type NameFormRequest = { name: string };type ReviewFormRequest = { review: string };// Menu action that triggers menu response formrouter.post("/internal/menu/start-workflow", async (_req, res) => { // Server processing before showing form const userData = await fetchUserData(); res.json({ showForm: { name: 'nameForm', form: { fields: [ { type: 'string', name: 'name', label: 'Name', }, ], }, data: { name: userData.name } // Pre-populate from server } });});// Form submission handler that can chain to another formrouter.post("/internal/form/name-submit", async (req, res) => { const { name } = req.body; // Server processing await saveUserName(name); // Show next form in workflow res.json({ showForm: { name: 'reviewForm', form: { fields: [ { type: 'paragraph', name: 'review', label: 'How was your experience?', }, ], } } });});router.post("/internal/form/review-submit", async (req, res) => { const { review } = req.body; await saveReview(review); res.json({ showToast: 'Thank you for your feedback!' });});
```

## Form object

The form object enables you to customize the form container and the list of form fields included.

#### Usage

```
const myForm = { title: 'My form', description: 'This is my form. There are many like it, but this one is mine.', fields: [ { type: 'string', name: 'food', label: 'What is your favorite food?', }, { type: 'string', name: 'drink', label: 'What is your favorite drink?', }, ], acceptLabel: 'Submit', cancelLabel: 'Cancel',};
```

#### Supported properties

PropertySupported typesDescription`title``string` `undefined`An optional title for the form`description``string` `undefined`An optional description for the form`fields``FormField[]`The fields that will be displayed in the form`acceptLabel``string` `undefined`An optional label for the submit button`cancelLabel``string` `undefined`An optional label for the cancel button

## Supported fields types

The following field types are supported: String, Select, Paragraph, Number, Boolean, Image, and Group.

### String

A single-line text input.

#### Usage

```
const stringField = { type: 'string', name: 'title', label: 'Tournament title',};
```

#### Properties

PropertySupported typesDescription`type``string`The desired field type.`name``string`The name of the field. This will be used as the key in the `values` object when the form is submitted.`label``string`The label of the field. This will be displayed to the user.`helpText``string` `undefined`An optional help text that will be displayed below the field.`required``boolean` `undefined`If true the field will be required and the user will not be able to submit the form without filling it in. Defaults to `false`.`disabled``boolean` `undefined`If true the field will be disabled. Defaults to `false`.`defaultValue``ValueType` `undefined`The default value of the field.`scope``SettingScopeType` `undefined`This indicates whether the field (setting) is an app level or install level setting. App setting values can be used by any installation. `undefined` by default.`placeholder``string` `undefined`Placeholder text for display before a value is present.`isSecret``boolean` `undefined`Makes the form field secret.

### Select

A dropdown menu with predefined options.

#### Usage

```
const selectField = { type: 'select', name: 'interval', label: 'Update the leaderboard', options: [ { label: 'Hourly', value: 'hourly' }, { label: 'Daily', value: 'daily' }, { label: 'Weekly', value: 'weekly' }, { label: 'Monthly', value: 'monthly' }, { label: 'Yearly', value: 'yearly' }, ],};
```

#### Properties

PropertySupported typesDescription`type``string`The desired field type.`name``string`The name of the field. This will be used as the key in the `values` object when the form is submitted.`label``string`The label of the field. This will be displayed to the user.`options``FieldConfig_Selection_Item[]`The list of options available.`helpText``string` `undefined`An optional help text that will be displayed below the field.`required``boolean` `undefined`If true the field will be required and the user will not be able to submit the form without filling it in. Defaults to `false`.`disabled``boolean` `undefined`If true the field will be disabled. Defaults to `false`.`defaultValue``string[]` `undefined`The default value of the field. Note that the default value is wrapped in an array to support multiple selected values.`scope``SettingScopeType` `undefined`This indicates whether the field (setting) is an app level or install level setting. App setting values can be used by any installation. `undefined` by default.`multiSelect``boolean` `undefined`Enables users to select more than 1 item from the set.

### Paragraph

A multi-line text input for longer responses.

#### Usage

```
const paragraphField = { type: 'paragraph', name: 'description', label: 'Description',};
```

#### Properties

PropertySupported typesDescription`type``string`The desired field type.`name``string`The name of the field. This will be used as the key in the `values` object when the form is submitted.`label``string`The label of the field. This will be displayed to the user.`helpText``string` `undefined`An optional help text that will be displayed below the field.`required``boolean` `undefined`If true the field will be required and the user will not be able to submit the form without filling it in. Defaults to `false`.`disabled``boolean` `undefined`If true the field will be disabled. Defaults to `false`.`defaultValue``ValueType` `undefined`The default value of the field.`scope``SettingScopeType` `undefined`This indicates whether the field (setting) is an app level or install level setting. App setting values can be used by any installation. `undefined` by default.`placeholder``string` `undefined`Placeholder text for display before a value is present.`lineHeight``number` `undefined`Sets the field height by number of lines.

### Number

An input for numerical values.

#### Usage

```
const numberField = { type: 'number', name: 'tokens', label: 'Token balance',};
```

#### Properties

PropertySupported typesDescription`type``string`The desired field type.`name``string`The name of the field. This will be used as the key in the `values` object when the form is submitted.`label``string`The label of the field. This will be displayed to the user.`helpText``string` `undefined`An optional help text that will be displayed below the field.`required``boolean` `undefined`If true the field will be required and the user will not be able to submit the form without filling it in. Defaults to `false`.`disabled``boolean` `undefined`If true the field will be disabled. Defaults to `false`.`defaultValue``ValueType` `undefined`The default value of the field.`scope``SettingScopeType` `undefined`This indicates whether the field (setting) is an app level or install level setting. App setting values can be used by any installation. `undefined` by default.

### Boolean

A yes/no or true/false type input.

#### Usage

```
const booleanField = { type: 'boolean', name: 'enable', label: 'Enable the event',};
```

#### Properties

PropertySupported typesDescription`type``string`The desired field type.`name``string`The name of the field. This will be used as the key in the `values` object when the form is submitted.`label``string`The label of the field. This will be displayed to the user.`helpText``string` `undefined`An optional help text that will be displayed below the field.`disabled``boolean` `undefined`If true the field will be disabled. Defaults to `false`.`defaultValue``ValueType` `undefined`The default value of the field.`scope``SettingScopeType` `undefined`This indicates whether the field (setting) is an app level or install level setting. App setting values can be used by any installation. `undefined` by default.

### Image

An image upload field.

#### Usage

```
const imageField = { type: 'image', // This tells the form to expect an image name: 'myImage', label: 'Image goes here', required: true,};
```

#### Properties

PropertySupported typesDescription`type``string`The desired field type.`name``string`The name of the field. This will be used as the key in the `values` object when the form is submitted.`label``string`The label of the field. This will be displayed to the user.`helpText``string` `undefined`An optional help text that will be displayed below the field.`required``boolean` `undefined`If true the field will be required and the user will not be able to submit the form without filling it in. Defaults to `false`.`disabled``boolean` `undefined`If true the field will be disabled. Defaults to `false`.`scope``SettingScopeType` `undefined`This indicates whether the field (setting) is an app level or install level setting. App setting values can be used by any installation. `undefined` by default.`placeholder``string` `undefined`Placeholder text for display before a value is present.`isSecret``boolean` `undefined`Makes the form field secret.

#### Notes

- The formats supported are PNG, JPEG, WEBP, and GIF.

- The maximum file size allowed is 20 MB.

- When uploading a WEBP image, it will be converted to JPEG. As such, the Reddit URL returned points to a JPEG image.

### Group

A collection of related fields that allows for better readability.

#### Usage

```
const groupField = { type: 'group', label: 'This is a group of input fields', fields: [ { type: 'paragraph', name: 'description', label: 'How would you describe what happened?', }, { type: 'number', name: 'score', label: 'How would you rate your meal on a scale from 1 to 10?', }, ],};
```

#### Properties

PropertySupported typesDescription`type``string`The desired field type.`label``string`The label of the group that will be displayed to the user.`fields``FormField[]`The fields that will be displayed in the group.`helpText``string` `undefined`An optional help text that will be displayed below the group.

## Examples

Below is a collection of common use cases and patterns.

### Dynamic forms

Client-side approach:

client/index.ts

```
import { showForm } from '@devvit/web/client';// Get user data and show form with dynamic default valuesconst user = await reddit.getCurrentUser();const result = await showForm({ form: { fields: [ { type: 'string', name: 'username', label: 'Username', }, ], }, data: { username: user?.username || '' }});if (result) { // Handle the form result console.log(`Hello ${result.username}`);}
```

Server-side approach:

devvit.json

```
{ "forms": { "dynamicForm": "/internal/form/dynamic-submit" }}
```

- Hono
- Express
server/index.ts

```
import type { MenuItemRequest, UiResponse } from '@devvit/web/shared';type DynamicFormRequest = { username: string };// Endpoint that shows form with dynamic dataapp.post('/internal/menu/show-dynamic-form', async (c) => { const _input = await c.req.json(); const user = await reddit.getCurrentUser(); return c.json({ showForm: { name: 'dynamicForm', form: { fields: [ { type: 'string', name: 'username', label: 'Username', }, ], }, data: { username: user?.username || '' } } });});// Form submission handlerapp.post('/internal/form/dynamic-submit', async (c) => { const { username } = await c.req.json(); return c.json({ showToast: `Hello ${username}` });});
```

server/index.ts

```
import type { MenuItemRequest, UiResponse } from '@devvit/web/shared';type DynamicFormRequest = { username: string };// Endpoint that shows form with dynamic datarouter.post("/internal/menu/show-dynamic-form", async (_req, res) => { const user = await reddit.getCurrentUser(); res.json({ showForm: { name: 'dynamicForm', form: { fields: [ { type: 'string', name: 'username', label: 'Username', }, ], }, data: { username: user?.username || '' } } });});// Form submission handlerrouter.post("/internal/form/dynamic-submit", async (req, res) => { const { username } = req.body; res.json({ showToast: `Hello ${username}` });});
```

### Multi-step forms

Client-side approach (Promise chaining):

client/index.ts

```
import { showForm } from '@devvit/web/client';async function multiStepForm() { // Step 1: Get name const step1Result = await showForm({ form: { fields: [ { type: 'string', name: 'name', label: "What's your name?", required: true, }, ], } }); if (!step1Result) return; // User cancelled // Step 2: Get food preference const step2Result = await showForm({ form: { fields: [ { type: 'string', name: 'food', label: "What's your favorite food?", required: true, }, ], }, data: { name: step1Result.name } // Pass data from previous step }); if (!step2Result) return; // User cancelled // Step 3: Get drink preference const step3Result = await showForm({ form: { fields: [ { type: 'string', name: 'drink', label: "What's your favorite drink?", required: true, }, ], }, data: { name: step1Result.name, food: step2Result.food } }); if (step3Result) { // All steps completed - save or process data const finalData = { ...step1Result, ...step2Result, ...step3Result }; console.log(`Thanks ${finalData.name}! You like ${finalData.food} and ${finalData.drink}.`); }}
```

Server-side approach (Separate endpoints):

devvit.json

```
{ "forms": { "step1Form": "/internal/form/step1-submit", "step2Form": "/internal/form/step2-submit", "step3Form": "/internal/form/step3-submit" }}
```

- Hono
- Express
server/index.ts

```
import type { UiResponse } from '@devvit/web/shared';type Step1FormRequest = { name: string };type Step2FormRequest = { name: string; food: string };type Step3FormRequest = { name: string; food: string; drink: string };// Step 1: Name formapp.post('/internal/form/step1-submit', async (c) => { const { name } = await c.req.json(); return c.json({ showForm: { name: 'step2Form', form: { fields: [ { type: 'string', name: 'food', label: "What's your favorite food?", required: true, }, ], }, data: { name } // Pass data to next step } });});// Step 2: Food formapp.post('/internal/form/step2-submit', async (c) => { const { name, food } = await c.req.json(); return c.json({ showForm: { name: 'step3Form', form: { fields: [ { type: 'string', name: 'drink', label: "What's your favorite drink?", required: true, }, ], }, data: { name, food } // Pass accumulated data } });});// Step 3: Final formapp.post('/internal/form/step3-submit', async (c) => { const { name, food, drink } = await c.req.json(); return c.json({ showToast: `Thanks ${name}! You like ${food} and ${drink}.` });});
```

server/index.ts

```
import type { UiResponse } from '@devvit/web/shared';type Step1FormRequest = { name: string };type Step2FormRequest = { name: string; food: string };type Step3FormRequest = { name: string; food: string; drink: string };// Step 1: Name formrouter.post("/internal/form/step1-submit", async (req, res) => { const { name } = req.body; res.json({ showForm: { name: 'step2Form', form: { fields: [ { type: 'string', name: 'food', label: "What's your favorite food?", required: true, }, ], }, data: { name } // Pass data to next step } });});// Step 2: Food formrouter.post("/internal/form/step2-submit", async (req, res) => { const { name, food } = req.body; res.json({ showForm: { name: 'step3Form', form: { fields: [ { type: 'string', name: 'drink', label: "What's your favorite drink?", required: true, }, ], }, data: { name, food } // Pass accumulated data } });});// Step 3: Final formrouter.post("/internal/form/step3-submit", async (req, res) => { const { name, food, drink } = req.body; res.json({ showToast: `Thanks ${name}! You like ${food} and ${drink}.` });});
```

### One of everything

This example includes one of each of the supported field types.

Client-side approach:

client/index.ts

```
import { showForm } from '@devvit/web/client';const result = await showForm({ form: { title: 'My favorites', description: 'Tell us about your favorite food!', fields: [ { type: 'string', name: 'food', label: 'What is your favorite food?', helpText: 'Must be edible', required: true, }, { label: 'About that food', type: 'group', fields: [ { type: 'number', name: 'times', label: 'How many times a week do you eat it?', defaultValue: 1, }, { type: 'paragraph', name: 'what', label: 'What makes it your favorite?', }, { type: 'select', name: 'healthy', label: 'Is it healthy?', options: [ { label: 'Yes', value: 'yes' }, { label: 'No', value: 'no' }, { label: 'Maybe', value: 'maybe' }, ], defaultValue: ['maybe'], }, ], }, { type: 'boolean', name: 'again', label: 'Can we ask again?', }, ], acceptLabel: 'Submit', cancelLabel: 'Cancel', }});if (result) { console.log('Form values:', result); // Handle form submission}
```

Server-side approach:

devvit.json

```
{ "forms": { "everythingForm": "/internal/form/everything-submit" }}
```

- Hono
- Express
server/index.ts

```
import type { MenuItemRequest, UiResponse } from '@devvit/web/shared';type EverythingFormRequest = { food: string; times?: number; what?: string; healthy?: string[]; again?: boolean;};app.post('/internal/form/everything-submit', async (c) => { const formValues = await c.req.json(); console.log('Form values:', formValues); return c.json({ showToast: 'Thanks!' });});// Example showing the formapp.post('/internal/menu/show-everything-form', async (c) => { const _input = await c.req.json(); return c.json({ showForm: { name: 'everythingForm', form: { title: 'My favorites', description: 'Tell us about your favorite food!', fields: [ { type: 'string', name: 'food', label: 'What is your favorite food?', helpText: 'Must be edible', required: true, }, { label: 'About that food', type: 'group', fields: [ { type: 'number', name: 'times', label: 'How many times a week do you eat it?', defaultValue: 1, }, { type: 'paragraph', name: 'what', label: 'What makes it your favorite?', }, { type: 'select', name: 'healthy', label: 'Is it healthy?', options: [ { label: 'Yes', value: 'yes' }, { label: 'No', value: 'no' }, { label: 'Maybe', value: 'maybe' }, ], defaultValue: ['maybe'], }, ], }, { type: 'boolean', name: 'again', label: 'Can we ask again?', }, ], acceptLabel: 'Submit', cancelLabel: 'Cancel', } } });});
```

server/index.ts

```
import type { MenuItemRequest, UiResponse } from '@devvit/web/shared';type EverythingFormRequest = { food: string; times?: number; what?: string; healthy?: string[]; again?: boolean;};router.post("/internal/form/everything-submit", async (req, res) => { console.log('Form values:', req.body); res.json({ showToast: 'Thanks!' });});// Example showing the formrouter.post("/internal/menu/show-everything-form", async (_req, res) => { res.json({ showForm: { name: 'everythingForm', form: { title: 'My favorites', description: 'Tell us about your favorite food!', fields: [ { type: 'string', name: 'food', label: 'What is your favorite food?', helpText: 'Must be edible', required: true, }, { label: 'About that food', type: 'group', fields: [ { type: 'number', name: 'times', label: 'How many times a week do you eat it?', defaultValue: 1, }, { type: 'paragraph', name: 'what', label: 'What makes it your favorite?', }, { type: 'select', name: 'healthy', label: 'Is it healthy?', options: [ { label: 'Yes', value: 'yes' }, { label: 'No', value: 'no' }, { label: 'Maybe', value: 'maybe' }, ], defaultValue: ['maybe'], }, ], }, { type: 'boolean', name: 'again', label: 'Can we ask again?', }, ], acceptLabel: 'Submit', cancelLabel: 'Cancel', } } });});
```

### Image uploads

Client-side approach:

client/index.ts

```
import { showForm } from '@devvit/web/client';const result = await showForm({ form: { title: 'Upload an image!', fields: [ { name: 'myImage', type: 'image', // This tells the form to expect an image label: 'Image goes here', required: true, }, ], }});if (result) { const { myImage } = result; // returns an i.redd.it URL console.log('Image uploaded:', myImage); // Process the image further await fetch('/api/process-image', { method: 'POST', body: JSON.stringify({ imageUrl: myImage }) });}
```

Server-side approach:

devvit.json

```
{ "forms": { "imageForm": "/internal/form/image-submit" }}
```

- Hono
- Express
server/index.ts

```
import type { UiResponse } from '@devvit/web/shared';type ImageFormRequest = { myImage: string };app.post('/internal/form/image-submit', async (c) => { const { myImage } = await c.req.json(); // Store the mediaUrl in Redis and render it via an tag on the client, or send to external service to modify console.log('Image uploaded:', myImage); return c.json({ showToast: 'Image uploaded successfully!' });});
```

server/index.ts

```
import type { UiResponse } from '@devvit/web/shared';type ImageFormRequest = { myImage: string };router.post("/internal/form/image-submit", async (req, res) => { const { myImage } = req.body; // Store the mediaUrl in Redis and render it via an tag on the client, or send to external service to modify console.log('Image uploaded:', myImage); res.json({ showToast: 'Image uploaded successfully!' });});
```


<!-- ============ /docs/capabilities/client/menu-actions ============ -->

> source: https://developers.reddit.com/docs/capabilities/client/menu-actions

- 
- Post Creation & Navigation
- Menu actions

# Menu actions

Add an item to the three dot menu for posts, comments, or subreddits. Menu actions can perform immediate client effects or trigger server processing followed by client effects.

## Basic menu actions

For most menu actions, use direct client effects. These provide immediate responses and are perfect for simple actions that don't require server processing.

Menu items defined in devvit.json:

devvit.json

```
{ "menu": { "items": [ { "description": "Show user information", "endpoint": "/internal/menu/show-info", "location": "post" } ] }}
```

Simple endpoint with direct client effects:

- Hono
- Express
server/index.ts

```
import type { MenuItemRequest, UiResponse } from "@devvit/web/shared";app.post("/internal/menu/show-info", async (c) => { const _input = await c.req.json(); // Simple actions don't need server processing return c.json({ showToast: "Menu action clicked!", });});
```

server/index.ts

```
import type { MenuItemRequest, UiResponse } from "@devvit/web/shared";app.post( "/internal/menu/show-info", async (_req, res) => { // Simple actions don't need server processing res.json({ showToast: "Menu action clicked!", }); },);
```

## Supported contexts

You can decide where the menu action shows up by specifying the location property.

PropertyValuesDescriptionlocation (required)`comment`, `post`, `subreddit`Determines where the menu action appears.postFilter (optional)`currentApp`Shows the action created by your app. The default is no filtering.forUserType (optional)`moderator`Specifies the user types that can see the menu action. The default is everyone.

note
For moderator permission security, when opening a form from a menu action with `forUserType: moderator`, the user initiating the action must complete all actions within 10 minutes.

## Menu responses

In Devvit Web, your menu item should respond with a client side effect to give feedback to users. This is available as a UIResponse as you do not have access to the `@devvit/web/client` library from your server endpoints.

Menu items with server processing:

devvit.json

```
{ "menu": { "items": [ { "label": "Process and validate data", "endpoint": "/internal/menu/complex-action", "forUserType": "moderator", "location": "subreddit" } ] }}
```

- Hono
- Express
server/index.ts

```
import type { MenuItemRequest, UiResponse } from "@devvit/web/shared";app.post("/internal/menu/complex-action", async (c) => { const _input = await c.req.json(); try { // Perform server-side processing const userData = await validateAndProcessData(); // Show form with server-fetched data return c.json({ showForm: { name: "processForm", form: { fields: [ { type: "string", name: "processedData", label: "Processed Data", }, ], }, data: { processedData: userData.processed }, }, }); } catch (error) { return c.json({ showToast: "Processing failed. Please try again.", }); }});
```

server/index.ts

```
import type { MenuItemRequest, UiResponse } from "@devvit/web/shared";app.post( "/internal/menu/complex-action", async (_req, res) => { try { // Perform server-side processing const userData = await validateAndProcessData(); // Show form with server-fetched data res.json({ showForm: { name: "processForm", form: { fields: [ { type: "string", name: "processedData", label: "Processed Data", }, ], }, data: { processedData: userData.processed }, }, }); } catch (error) { res.json({ showToast: "Processing failed. Please try again.", }); } },);
```

### Menu response examples

Menu responses can trigger any client effect after server processing:

Show toast after processing:

- Hono
- Express

```
return c.json({ showToast: { text: "Processing completed!", appearance: "success", },});
```

```
res.json({ showToast: { text: "Processing completed!", appearance: "success", },});
```

Navigate after data fetching:

- Hono
- Express

```
const post = await reddit.getPostById(postId);return c.json({ navigateTo: post,});
```

```
const post = await reddit.getPostById(postId);res.json({ navigateTo: post,});
```

Chain multiple forms:

- Hono
- Express

```
// First form response leads to second formreturn c.json({ showForm: { name: 'secondForm', form: { fields: [...] }, data: { fromStep1: processedData } }});
```

```
// First form response leads to second formres.json({ showForm: { name: 'secondForm', form: { fields: [...] }, data: { fromStep1: processedData } }});
```

## Limitations

- A sort order of actions in the context menu can't be specified.

- The context, name, and description fields do not support dynamic logic.


<!-- ============ /docs/capabilities/client/navigation ============ -->

> source: https://developers.reddit.com/docs/capabilities/client/navigation

- 
- Post Creation & Navigation
- Navigation

# Navigation

Use navigation functions to redirect users to Reddit content or external websites in response to user actions, such as button clicks. You can redirect to a `url` string or to objects such as `Subreddit`, `Post`, or `Comment`.

For most navigation interactions, use the direct client library functions. These provide immediate navigation and are perfect for user interactions within your app components.

warning
When linking to Reddit content, the navigation function requires the app account to have access to the content. If the app account does not have access, the redirect will fail.

## Basic navigation

client/index.ts

```
import { navigateTo } from '@devvit/web/client';// Navigate to external URLsnavigateTo('https://www.youtube.com/watch?v=dQw4w9WgXcQ');// Navigate to Reddit URLsnavigateTo('https://www.reddit.com/r/movies/comments/tzxev3/');// Navigate to Reddit objectsasync function goToPost() { const post = await fetch('/api/getPost').then(r => r.json()); navigateTo(post);}// Use in button handlers or user interactionsfunction handleNavigateClick() { navigateTo('https://www.reddit.com/r/webdev');}
```

### Parameters

`navigateTo(target)`

- `target`: Either a URL string or a Reddit object (Subreddit, Post, Comment)

:::tip Menu response navigation
For navigation in menu response workflows (when you need server processing before navigation), see the Menu Actions documentation.
:::

## External URLs

Users see a confirmation dialog before going to external URLs.

## Limitations

- `url` must be http/https

- `url` must have a domain


<!-- ============ /docs/capabilities/client/toasts ============ -->

> source: https://developers.reddit.com/docs/capabilities/client/toasts

- 
- Post Creation & Navigation
- Toasts

# Toasts

Display temporary notification messages to users at the bottom of the screen.

## Overview

Toasts are brief, non-intrusive messages that appear temporarily at the bottom of the screen to provide feedback to users about their actions. They automatically disappear after a few seconds and are ideal for confirming successful operations or displaying status updates.

For most toast interactions, use the direct client library functions. These provide immediate feedback and are perfect for user interactions within your app components.

note
Toasts will not work from scheduled jobs or triggers.

## Toast appearance types

AppearanceDescription`neutral`Default gray appearance for general notifications`success`Green appearance for successful operations

## Basic toast usage

```
import { showToast } from '@devvit/web/client';// Simple text toastshowToast('Operation completed successfully!');// Toast with custom appearanceshowToast({ text: 'Data saved successfully!', appearance: 'success', // 'neutral' | 'success'});// Use in button handlers or user interactionsfunction handleButtonClick() { try { // Perform some operation processUserData(); showToast({ text: 'Your data has been processed!', appearance: 'success' }); } catch (error) { showToast('Something went wrong. Please try again.'); }}
```

### Parameters

`showToast(textOrToast)`

- `textOrToast`: Either a string message or a `Toast` object

Toast Object Properties:

- `text` (string): The message to display

- `appearance` (string, optional): The visual style (`'neutral'` | `'success'`). Defaults to `'neutral'`

:::tip Menu response toasts
For toasts in menu response workflows (when you need server processing before showing toasts), see the Menu Actions documentation.
:::

## Best practices

- Keep toast messages concise and clear

- Avoid showing multiple toasts in quick succession

- Don't rely on toasts for critical information that users must see


<!-- ============ /docs/capabilities/creating_custom_post ============ -->

> source: https://developers.reddit.com/docs/capabilities/creating_custom_post

- 
- Post Creation & Navigation
- Creating a Custom Post

# Creating a Custom Post

Redditors interact with your app through custom posts. To create a custom post, you’ll define the entry points in `devvit.json,` then use `submitCustomPost` to create a post that references one of those entry points.

## How it Works

Each key in the `entrypoints` object (e.g. "default", "game") maps to an HTML file in your build output. When you call `submitCustomPost`, the entry parameter references one of these keys.

```
// devvit.json default template... "name": "test-custom-post", "post": { "dir": "dist/client", "entrypoints": { "default": { "entry": "splash.html" }, "game": { "entry": "game.html" } } }...
```

```
import { reddit } from '@devvit/web/server';export const createPost = async () => { return await reddit.submitCustomPost({ title: 'Example title for post', entry: 'default' // default });};
```

`submitCustomPost` accepts the following optional parameters:

ParameterDescription`entry`Key of the entrypoint defined in `devvit.json``postData`Updates post data after creation`textFallback`Specifies alternative text content`userGeneratedContent`Enables user-generated content`styles`Controls post appearance in the Reddit UI. See Custom Post Styles

## Custom Post Styles

Custom post styles let you control how a custom post looks in the Reddit UI, separate from the content inside your webview. You can:

- Set the light mode or dark mode background color shown while the iframe loads

- Choose the post height (for example, `“REGULAR”` or `“TALL”`) to control how much vertical space the post takes in the feed.

- Provide a share image URL that’s used for link previews when the post is shared outside Reddit.

All style fields are optional. If you don’t set them, Reddit’s default settings apply.

### Properties

FieldTypeDescription`backgroundColor``string` (optional)The default background color shown before the iframe content loads. Must be in `#RRGGBBAA` format (red, green, blue, alpha transparency). The value is case-insensitive. Defaults to transparent (`#00000000`).`backgroundColorDark``string` (optional)The dark mode background color shown before the iframe content loads. Must be in `#RRGGBBAA` format with a leading `#`. Defaults to transparent (`#00000000`).`height``EntrypointHeight` enum (optional)Post height. `TALL` = 512px, `REGULAR` = 320px. Width varies from ~288–880px depending on device and viewport. Defaults to `”TALL”`.`shareImageUrl``string` (optional)The preview image URL used when the post is shared externally (for example, OpenGraph `og:image`). Note: The image must be hosted on i.redd.it domain. Use the media upload plugin to upload a custom image. This only works if your app is on a public subreddit. Defaults to Reddit’s generic share image: `https://i.redd.it/o0h58lzmax6a1.png`.

### Creating a custom post with styles

Set your custom post styles when you create a custom post:

```
await reddit.submitCustomPost({ "title": "Post with styles title", "styles": { "backgroundColor": "#FFFFFFFF", // white, fully opaque "backgroundColorDark": "#000000FF", // black, fully opaque "height": "TALL", "shareImageUrl": "https://reddi.it/12345.png" }})
```

Note: All style fields are optional.

### Updating styles

Use `post.setCustomPostStyles()` to update styles on an existing post. Only include the fields you want to change. Omitted fields remain unchanged.

```
const post = await reddit.getPostById(context.postId);await post.setCustomPostStyles({ "styles": { "shareImageUrl": "https://example.com/new-preview.png" }});
```

Existing `background_color`, `background_color_dark`, and `height` values remain unchanged.

### Reading styles

Use `post.getCustomPostStyles()` or `reddit.getPostStyles(id)` to read the styles on an existing post. Settings that haven’t been set yet will give you their default values.

```
const post = await reddit.getPostById(context.postId);const styles = await post.getCustomPostStyles();// Or, if you don't need the post object and want just the styles:const styles = await reddit.getPostStyles(context.postId);
```

# Best Practices

- 
Color format: Always provide 8-digit hex with alpha: `#RRGGBBAA`.

- `RR`, `GG`, `BB`: 00–FF (0–255) color channels.

- `AA`: 00–FF alpha channel (`00` = fully transparent, `FF` = fully opaque).

- 
Transparency: Use alpha (`AA`) to blend your app experience smoothly with Reddit backgrounds (for example, `#00000080` for semi-transparent black).

- 
Dark mode: Always set `background_color_dark` when your iframe content has a dark theme so the pre-load state matches the final experience.

- 
Height: Choose the `height` that best matches your UI. The platform will handle mapping that logical value to the correct pixel height for the client.

- 
Share image: Must be hosted on i.redd.it (use the media upload plugin) and ensure the asset meets typical OpenGraph sizing and aspect-ratio expectations so it renders cleanly across platforms. This only works if your app is on a public subreddit.


================================================================================
# Realtime
================================================================================



<!-- ============ /docs/capabilities/realtime/overview ============ -->

> source: https://developers.reddit.com/docs/capabilities/realtime/overview

- 
- Realtime Apps
- Overview

# Overview

Create live and event-driven interactive posts. Realtime provides a set of primitives that lets you build interactive posts that are:

- Live. Users engaging with the same interactive post see each others’ changes without any observable lag.

- Event-driven. Posts render automatically in response to server events.

- Synced. Using realtime with Redis lets you build persistent community experiences that are backed by high performance data synchronization.

Realtime is supported in Devvit Web applications.

# Realtime in Devvit Web

This guide walks through step-by-step instructions on how to set up Realtime in a Devvit Web application

## Overview

The realtime client allows you to:

- Connect to realtime channels for receiving messages

- Handle connection lifecycle events (connect/disconnect)

- Process incoming messages with custom logic

- Manage multiple channel subscriptions

- Disconnect from channels when no longer needed

## Architecture

Realtime functionality in Devvit follows a client/server architecture:

- Client-side (connectRealtime): Subscribe to channels and receive messages

- Server-side (realtime.send): Send messages to channels

This separation ensures that message sending is controlled by server-side logic while clients can freely subscribe to channels they're interested in.

## Client-side API reference

### connectRealtime

Connects to a realtime channel for receiving messages.

client/index.ts

```
import { connectRealtime } from '@devvit/web/client';const connection = await connectRealtime({ channel: 'my-channel', onConnect: (channel) => { console.log(`Connected to ${channel}`); }, onDisconnect: (channel) => { console.log(`Disconnected from ${channel}`); }, onMessage: (data) => { console.log('Received message:', data); },});
```

#### Parameters

- `opts` - Connection options object

- `channel` (string) - The name of the channel to connect to. Note, you cannot use the `:` character in the channel name

- `onConnect?` (function) - Optional callback called when connection is established

- `onDisconnect?` (function) - Optional callback called when connection is lost

- `onMessage` (function) - Required callback called when a message is received

#### Returns

A `Connection` object with a `disconnect()` method.

### Connection

A connection object returned by `connectRealtime()`.

#### Methods

##### disconnect()

Disconnects from the realtime channel.

```
await connection.disconnect();
```

This method:

- Removes the channel from active subscriptions

- Cleans up event listeners

- Calls the `onDisconnect` callback if provided

## Server-side API reference

### Realtime plugin

The server-side plugin for sending messages to realtime channels.

server/index.ts

```
import { realtime } from '@devvit/web/server';// Send a message to a channelawait realtime.send('my-channel', { type: 'user-joined', userId: '123',});
```

#### Methods

##### send(channel: string, msg: JSONValue): Promise

Sends a message to a specific channel.

- `channel` (string) - The name of the channel to send the message to

- `msg` (JSONValue) - The message data to send

## Usage examples

### Client-side: basic channel connection

client/index.ts

```
import { connectRealtime } from '@devvit/web/client';// Connect to a channelconst connection = await connectRealtime({ channel: 'user-updates', onMessage: (data) => { // Handle incoming messages console.log('User update:', data); },});// Later, disconnect when doneawait connection.disconnect();
```

### Client-side: connection lifecycle management

client/index.ts

```
import { connectRealtime } from '@devvit/web/client';const connection = await connectRealtime({ channel: 'live-chat', onConnect: (channel) => { console.log(`Connected to ${channel}`); // Update UI to show connected state setIsConnected(true); }, onDisconnect: (channel) => { console.log(`Disconnected from ${channel}`); // Update UI to show disconnected state setIsConnected(false); }, onMessage: (data) => { // Process chat messages addMessageToChat(data); },});
```

### Server-side: sending messages

server/index.ts

```
import { realtime } from '@devvit/web/server';// Send a simple messageawait realtime.send('notifications', 'New user joined!');// Send a structured messageawait realtime.send('game-updates', { type: 'score-update', playerId: 'user123', score: 1500, timestamp: Date.now(),});
```


================================================================================
# Devvit Rules (publishing policy)
================================================================================



<!-- ============ /docs/devvit_rules ============ -->

> source: https://developers.reddit.com/docs/devvit_rules

- 
- Devvit Rules

# Devvit Rules

## Overview

Welcome to Reddit’s Developer Platform (or “Devvit”)! Before you build, please read these Devvit Rules along with Reddit’s Developer Terms. We want you and your Devvit app(s) to succeed, and our policies and developer documentation are designed to enable you to provide a fun, safe, and trusted experience for all redditors. We expect you to be honest about your app(s), and to respect the privacy, safety, and other rights of redditors.

You must comply with: these Devvit Rules and Reddit’s Developer Terms, Developer Data Protection Addendum, and Data API Terms; our User Agreement, Econ Terms, Previews Terms, Privacy Policy, Public Content Policy, Reddit Rules and Advertising Policy; and all other policies and developer documentation governing the use of our developer services (collectively, “Reddit Terms & Policies”). We may update Reddit Terms & Policies from time to time, so please check in and review them regularly.

## Reddit app review

Your app is subject to our app review and approval. Reddit may reject or remove any app that violates these Devvit Rules or any other Reddit Terms & Policies at our discretion. We may also suspend or ban accounts tied to developers who violate these Devvit Rules or any other Reddit Terms & Policies.

These Devvit Rules are intended to clarify how we review Devvit apps and streamline the process for you and Reddit. Our goal is to keep redditors safe and enable developers to build fun and useful apps for redditors. This means our Devvit Rules may evolve over time, which you should keep in mind when building or updating your app. Please reach out if you have any questions on these Devvit Rules. Any exceptions to these Devvit Rules or any other Reddit Terms & Policies must be approved in writing by Reddit.

You can use Devvit and test your app without needing to submit it to Reddit’s App Review. However, to make your app visible in the Reddit App Directory and publicly available for other mods and admins to install, you’ll need prior app approval. Additionally, if you want to unlock premium features for your app (for example, payments, fetching, or using LLMs), you’ll also need prior app approval.

You can start the Reddit app review process by publishing your app. Before starting a Reddit app review, we recommend:

- Thoroughly playtesting your app,

- Carefully reviewing these Devvit Rules and other Reddit Terms & Policies, and

- Providing a detailed app description.

As part of Reddit app review, we may review your code, read through your app’s description, test your app, and provide feedback. We may use third-party LLMs to help us conduct this review. When your app review is complete, we’ll notify you about your app’s status, which could be:

- Approved

- Approved with non-blocking feedback

- Rejected with feedback on how to get your app approved

- Rejected due to a violation of Devvit Rules or other Reddit Terms & Policies

Our app review process typically takes approximately one week from receipt of a complete submission, but may take longer depending on app review volumes or complexity of a given app. We aim to promptly review all apps but cannot guarantee a specific review time, particularly if your app seeks to unlock premium features. Our Devvit Rules and Reddit Terms & Policies are also evolving, which can impact the status of previously reviewed apps. Please be patient with us as we build Devvit and review your app.

You are required to resubmit your app for Reddit app review every time you publish changes to it. However, if your updates do not alter your app’s functionality significantly or in a way that might impact its compliance with these Devvit Rules or any other Reddit Terms & Policies, then your updates will go through a streamlined review.

We may require you to provide additional information to us in order to complete our app review. We also may periodically or randomly re-review your app and require you to make changes or otherwise face a suspension or ban of your app if we find it to no longer be compliant with these Devvit Rules and Reddit Terms & Policies.

If you have questions about Reddit’s app review and approval process or these Devvit Rules, please reach out for help.

## General rules

### Build for a quality experience

You and your app(s) must:

- Provide discrete functionality and always try to make Reddit more enjoyable

- Maintain functionality that communities rely on, communicate when you cannot, and make it easy to contact you for support

- Be transparent and use clear naming and descriptions that accurately describe your app’s functionality, purpose, and data practices

- Include your own terms of service and privacy policy if your app uses premium features (for example, payments, fetching, or using LLMs) or if requested by Reddit

- Provide accurate information about your relationship with Reddit or any other person or entity, including other developers (for example, by including them in your app description)

- Test your app locally and in sandbox subreddits when applicable

- Avoid enabling or allowing others to violate these Devvit Rules or other Reddit Terms & Policies

### Make mod apps easy to use

If your app is intended to be used by mods for moderation purposes, please consider how the app should be configured by mods and provide instructions in your app description. Your instructions should empower mods to know how to use your app safely and responsibly for community governance purposes.

# Safety Rules

### Protect redditors from harm

You and your app(s) must:

- 
Comply with our Reddit Rules and our Moderator Code of Conduct

- 
Avoid facilitating, promoting, or amplifying:

- 
Any form of dangerous activities;

- 
Harmful or illegal content; or

- 
Illegal or legally restricted activities

- 
Ensure proper labeling and warning prior to exposing redditors to graphic, sexually-explicit, or offensive content

- 
Prevent the manipulation of Reddit's features (e.g., voting, karma) or the circumvention of safety mechanisms (e.g., user blocking, account bans)

- 
Avoid deceptive content (e.g., spam, malware) or adverse actions that may interfere with the normal use of Reddit (e.g., introducing malicious code or programs that violate these Devvit Rules or other Reddit Terms & Policies)

- 
Build and implement adequate safeguards to prevent illegal or harmful content or functionality that may violate our Reddit Rules

- 
Provide app users with a way to report issues with the app or violations of these Devvit Rules and review and appropriately action user reports

You and your app(s) must not:

- 
Attempt to publish an app targeting anyone under 13 — redditors must be over the age of 13 to use the platform!

- 
Display mature content to redditors without appropriate labels or age-gating functionality

- 
Include, encourage, or promote illegal or harmful content or functionality, including violence, harassment, bullying, hate speech, threats, or self-harm

- 
Include or promote deceptive content, functionality, actions, or terms (for example, any form of spam or malware)

### Don’t build restricted apps

You should not create an app or functionality that promotes or facilitates transactions in a prohibited or regulated industry such as (but not limited to) gambling, healthcare, financial and cryptocurrency products and services, political, alcohol, recreational drugs, or any other restricted category listed in the Reddit Advertising Policy.

### No linking out to external apps

Apps should not link out to other apps, or promote other versions of the app on external platforms. This includes, but is not limited to:

- "Demo" apps published on Devvit that link out to a full version of the app on other platforms

- Apps that promote or upsell a link to playing the same app on other platforms

- Apps that ask users to create a profile outside of Reddit

Reddit reserves the right to reject, limit, or remove any app that encourages users to navigate off-platform, regardless of whether the app falls into the specific categories listed above.

### Apps may be limited or removed

If your app violates any of these Devvit Rules or any other Reddit Terms & Policies, including by mods or redditors using your app, then we may suspend or remove your app from Devvit or require you to update it or add disclaimers. We may also limit your app (including its reach, access to content, and functionality) when appropriate.

All apps we deem to have potential safety issues will need to provide additional information. We expect you to be able to quickly and effectively handle any concerns raised about safety.

## Privacy and data rules

### Handle data with care

Your app must comply with all privacy and data protection requirements outlined in Reddit’s Developer Terms, Developer Data Protection Addendum, and other Reddit Terms & Policies. We take the privacy of redditors seriously and expect you to do so as well. You must:

- 
Respect redditors' data and privacy – never intrude on redditors’ privacy and autonomy in spaces your app isn't authorized to access or moderate, and never try to re-identify, de-anonymize, unscramble, unencrypt, or reverse hash or reverse engineer data about redditors, Reddit, or Devvit;

- 
Get consent from redditors – get explicit consent and appropriate permissions before processing data, or taking any actions (automated or not), on behalf of redditors (including before making any modification to redditors’ accounts), respect user decisions to opt-out or block or remove your app (as applicable), and only use data necessary for your app's stated functionality;

- 
Minimize data used – build with data minimization in mind and never request that redditors share their login credentials or any other personal information to access or complete any action through your app or otherwise collect passwords, credentials, or other personal information from redditors;

- 
Be honest (no scams or spam) – never collect, solicit, or deceive redditors into providing passwords, credentials, or other personal information to you or your app, and never scam nor spam redditors (for example, by frequently sending unsolicited messages) about your app without permissions;

- 
Be transparent – be up front about your data practices, ensure all consents and permissions are complete, accurate, and clearly labeled, and notify Reddit and your users if your app is compromised (e.g., data breach, unauthorized access);

- 
Never profile redditors – never process data to profile or otherwise infer redditors' personal characteristics, such as racial or ethnic origin, political opinions, religious or philosophical beliefs, union membership, genetics or biometrics, health, sex life, or sexual orientation;

- 
Never surveil redditors – never gather intelligence nor attempt to track redditors or Reddit content for the purpose of surveillance, or to provide that information to governments or other entities conducting surveillance;

- 
Never sell data – never sell, license, share, or otherwise commercialize data about redditors or Reddit (including by mining or scraping data from Reddit or Devvit) to target ads, use data brokers, ad networks, or other related services, train machine learning or artificial intelligence models (including large language models), or otherwise commercialize data;

- 
Keep your app secure – keep your app (including your app data and app user data) secure, and do not enable it to bypass or circumvent Reddit’s or Devvit’s privacy, safety, or security features and enforcement measures (including any taken against your app);

- 
Keep it legal – never transmit data of persons under 13 or data that includes protected health info, financial info, or other sensitive info under law; and

- 
Comply with our Public Content Policy – abide by all restrictions described in our Public Content Policy.

### Be careful using external sites or services

If your app uses HTTP Fetch or otherwise collects personal information about app users, we require you to have a terms of service and privacy policy and include a link to both in your app. Your terms of service and privacy policy must completely and accurately describe how you and your app collects, uses, shares, and stores data and why. (Please note that links to Reddit’s User Agreement and/or Privacy Policy will not be accepted.)

If your app links to any third-party site that may collect redditor personal data, you are solely responsible for verifying the legitimacy and security of the third-party site and should ensure that they are in compliance with all applicable laws. For example, you should ensure that a site collecting personal data provides a privacy policy that clearly discloses what data is collected, how the data is used, and how the data is shared.

You’ll also need permission during app review to direct redditors outside of Reddit or otherwise collect personal information about them. To request HTTP Fetch functionality for a specific domain, please follow these instructions.

## Content rules

### Keep user and app content safe

Any content used or created by your Devvit app must comply with Reddit Terms & Policies. For example:

- 
Using Existing User Content – your app may copy and display existing Reddit user content and modify it for display, but only in compliance with Reddit’s Developer Terms. User content on Reddit is owned by redditors and not by Reddit, so you must also comply with all requirements or restrictions imposed by the owners of user content. Ask redditors for their permission if you want to use existing user content in ways they might not expect (e.g., by building an in-app pop-up asking for redditor approval).

- 
Generating New User Content – your app may allow new user content to be created by redditors, but all user content must comply with Reddit’s User Agreement, Reddit Rules, and Advertising Policy.

- 
Post or Comment Attribution Rules – if your app supports the creation of new posts or comments on Reddit by redditors, then you should create a new post or comment with the content author clearly identified as the author of the submitted content. Until your app is approved by Reddit, new content from your app will be posted from your Devvit app account. If your app is approved, then submitPost will post on behalf of the content author.

- 
In-App Content Rules – if your app allows users to create new forms of user content within your app (for example, a form submission that modifies the content of your app), your app should limit the available forms of expression to prevent potential abuse. Appropriate examples of limited expression include emojis, symbols (e.g., stock tickers), and predefined, safe dictionaries. If you want to minimize the risk of abuse, avoid allowing users to create new in-app content through free-form text inputs in your app.

- 
Displaying Devvit App Content – your app may include information, materials, and other content that you provide and make available through your app. Your app content must also comply with these Devvit Rules, Reddit’s User Agreement, Reddit Rules, and Advertising Policy. You may not use external logos or trademarks in your app without express written permission.

If any content created or otherwise displayed through your app violates these Devvit Rules or other Reddit Terms & Policies, then Reddit may remove the content and/or request you remove the content. Failure to do so can result in your app being removed from Devvit.

### User action requirements

If your app uses user actions (posting, commenting, or subscribing on behalf of the user), you must follow these requirements. Apps that do not meet them will be rejected during review.

- 
When to post or comment as the user:

- If users enter text or imagery that appears in your app, publish that content with reportable, actionable attribution — such as posts or comments submitted as the user.

- For score sharing, comments must be submitted as the user, not the app account.

- 
Before you post or comment as the user:

- Trigger the action only via an explicit manual action (for example, a button). Users must clearly understand what will happen before they confirm.

- Make it clear they are posting or commenting as themselves, including what will appear on Reddit and when their username is shown to others.

- Label buttons and flows so the action is obviously from the user's account, not only the app account.

- Do not automate these actions, and do not mislead or surprise users.

- 
When posting or commenting as the user:

- Set `userGeneratedContent` correctly for posts submitted on behalf of the user.

- For generic score comments, reply to a sticky comment. If the user adds meaningful commentary to their score, a top-level comment is allowed.

- 
Subscribe actions and gating:

- Subscribing on behalf of the user must also be explicit and manual, with clear user understanding before confirmation.

- Do not require or encourage posting, commenting, or subscribing as a condition of progress, access, or core functionality.

- Do not merge gameplay actions with posting, commenting, or subscribing — each action must remain a separate, clear choice.

### Enable and respect user deletions

Whether your app uses existing user content or otherwise allows users to create new user content, you and your app must always honor user deletion requests and respect redditors’ privacy rights. More specifically:

- 
Deleting Existing User Content – you are required to remove any user content that has been deleted from Reddit, including from your Devvit app(s). We provide access to post and comment delete events via triggers to help facilitate this.

- 
Post/Comment Deletions – On PostDelete and CommentDelete event triggers, you must delete all content related to the post and/or comment (for example, title, body, embedded URLs, etc.) from your app. This includes data that is in the Redis/KVstore and data sent to an external service. Metadata required for contextualizing related content (for example, post or comment ID, createdAt, etc.) may be retained.

- 
Account Deletions – When a user account is deleted, the related user ID (t2_*) must be completely removed from your hosted datastores (e.g., Redis) and any external systems. You must also delete all references to the author-identifying information (including the author ID, name, profile URL, avatar image URL, user flair, etc.) from posts and comments created by that account. You may continue to keep posts and comments created by deleted accounts, provided that the posts and comments have not been explicitly deleted.

- 
Setting Up Auto-Deletion – To best comply with this policy, we recommend deleting any stored user data within 30 days. For any data you are storing in Redis, you can use the expire function to ensure data gets deleted automatically.

- 
Enabling Deletions of New User Content – if your app allows users to create new user content, you must ensure that users have the ability to remove their own content when desired and comply with all legal requirements related to content removals. It is important to have safety guardrails in place if your app allows users to create new user content so that the content can be reported and removed by app users.

Any retention of content and data that has been deleted, even if disassociated, de-identified or anonymized, is a violation of our terms and policies.

## Reddit brand and IP rules

### Don’t use Reddit IP

Do not use any Reddit trademarks (e.g., REDDIT or SNOO) or other brand assets in your app. Check out our Brand Guidelines and Trademark Use Policy to learn more.

Your app should be creative and unique and have an original name and branding. It shouldn’t be similar to or confusingly reference Reddit. Do not suggest any endorsement, partnership, sponsorship, or affiliation with Reddit by using Reddit trademarks or other brand assets. For example, do not name your app “Reddit Community Fundraisers” or use Reddit’s alien mascot Snoo as a game character in your app.

Reddit may, at our discretion, permit you to use Reddit trademarks or other brand assets in your app, but all use must comply with our Brand Guidelines and Trademark Use Policy and must be approved by Reddit in writing before your app is published. This review-and-approval process is in addition to our standard app review; for example, if you are given permission to use Snoo in your app, any plot or dialogue with Snoo must be submitted to Reddit for review and approval.

Developers who fail to respect Reddit’s intellectual property may lose access to Devvit, as well as face other enforcement actions by Reddit.

### Don’t use third-party IP w/o permission

Do not infringe any third-party intellectual property rights or otherwise use any third-party intellectual property in your app without explicit permission. This means no copycat or clone apps. We want apps built on Reddit’s Developer Platform to be unique and solve real use cases for communities and their users.

Your app must:

- 
Be original and innovative – we know you have great ideas and can’t wait to see how you introduce new features or improve existing ones in a meaningful way.

- 
Respect intellectual property – be fair to others. Don’t copy code, UI, images, or logos from other apps without permission and respect existing trademarks and copyrights.

- 
Not cause confusion – apps that impersonate another app, developer, or service are prohibited. This includes cloning apps or suggesting that an app is another app that already exists.

Apps that violate any of these guidelines are subject to removal from Reddit’s Developer Platform at any time, and we may suspend or ban any developer who violates these Devvit Rules and other Reddit Terms & Policies.

## Payment rules

### Pilot Devvit goods

You may be able to monetize your Devvit app by offering certain digital avatars, goods, currencies, items, products, or features through your Devvit app (your “app goods”). In order to unlock and use Devvit Payments, you and your app must abide by Reddit’s Earn Terms and Earn Policy, in addition to these Devvit Rules and other Reddit Terms & Policies. For example, you and your app cannot:

- 
Enable gambling, including the purchase of cryptocurrencies or other digital assets that can be exchanged for real money,

- 
Have deceptive pricing terms or limit functionality behind a paywall or in-app purchase, or

- 
Direct redditors off-platform to provide payment to you (e.g., sending you money directly or offering to buy you a coffee).

We’re currently piloting Devvit Payments with a small number of developers. Check out our Earn Terms and Earn Policy for more information.

### Link carefully to external financial services

If your app links to any third-party site that facilitates financial transactions, you are solely responsible for verifying the legitimacy and security of the third-party site and should ensure that they are in compliance with all applicable laws. For example, you should ensure that a charitable organization collecting donations is registered as a 501(c)(3) organization (or local equivalent) and provides necessary tax receipts. To the extent that you intend to include links to such third-party sites, you must provide your own terms of service and privacy policy.

## Account-linked services

Devvit apps requiring association with external user accounts (Account-linked services) must adhere to specific guidelines. Examples include "Verified positions" apps for posting verified stock holdings, fitness apps for workout stats, and gaming accounts for leaderboard positions.

Such apps cannot be published in public subreddits until app review is complete.

### Guidelines for account-linked services

- Anonymize all user-identifying information (user IDs, usernames, profile image, etc.) before sending to external servers.

- The only permitted linkage between identities on Reddit and external user accounts is a unique ID.

- Information imported into Reddit must not contain any personal data (including but not limited to PII, real names, or other information that could be used to identify an individual).

- Users must explicitly opt-in to connecting external services and a corresponding consent prompt must be present.

- Provide ability to unlink connected accounts and log out of connected services.

- Delete user data on external services within 30 days upon unlinking logging out.

- Link to terms, conditions, and privacy policy that outline the type of data being collected.

### Guidelines for external services for account linking

- External services connecting Reddit user data to external account data must have SOC2 Type II compliance.

- Provide evidence of recent (12 months prior) penetration test by an accredited third party with no High or Critical findings or appropriate remediation and retest attestation.

- Account-linked services must be limited to read-only OAuth scopes to external user accounts. Username/password authentication is not permitted to external services.

## Generative AI/LLM rules

### Only use approved LLMs

Your Devvit apps can use approved Large Language Models (“LLMs”) via the fetch functionality, provided your app adheres to the following guidelines as well as the Reddit Terms & Policies. Your app:

- Provides significant and unique benefit to Reddit users and communities through Reddit;

- Uses an approved LLM (see approved LLM services below);

- Does not use Reddit data to create, improve, modify, train, fine-tune or allow any third-party access to create, improve, modify, train or fine-tune any Generative AI, LLM, ML, or NLP models using Reddit Data*;

- Includes terms of services and a privacy policy for handling user data; and

- Adheres to all other rate limits and guidelines as outlined in our Developer Terms.

If you are interested in using Reddit data for LLM training for research or commercial purposes, please submit a request here.

Approved LLMs:

- 
Google Gemini

- 
OpenAI ChatGPT

For the avoidance of doubt, self-hosted LLMs (e.g. LLama, mistral, hugging face) are not approved for use at this time.

Reddit reserves the right to update these guidelines, including approved LLMs, at any time. It is your responsibility to ensure your app is compliant with the latest guidelines.

## Reporting rules

### Contact your app users

If you want to contact users of your app, you'll currently need to coordinate with our team. This will change in the future, but please reach out to the Developer Platform team to communicate key updates, bugs, etc.

### Reporting violations of the Devvit Rules

If you see an app breaking the Devvit Rules, please report it via Modmail. We will investigate the case and action it if appropriate.

However, we ask our community to assume positive intent, and to only make considered, good faith reports. Persistent hypervigilance over other developers, overzealous reporting, “witch-hunting” or repeated attempts to discredit or rally against other developers will not be tolerated. Doing so makes it harder for our team to review and respond to genuine issues, and can result in a violation of our community rules.

If you see an app or user breaking Reddit Rules, make sure to report the violating content directly through the Reddit report flow.


================================================================================
# Guides — best practices / launch / faq / ai
================================================================================



<!-- ============ /docs/guides/best-practices/mod_resources ============ -->

> source: https://developers.reddit.com/docs/guides/best-practices/mod_resources

- 
- Best Practices
- Mod Resources

# Mod Resources

Devvit apps are programs hosted and run on Reddit’s Developer Platform. Moderators can install an app on their subreddits to customize a community with bespoke mod tools, discussion bots, new governance tools, games, leaderboards, and more.

note
Some apps are for everyone in the community, while others are limited to moderators in the community. Moderation apps will often have buttons that show up in, or with, the mod shield icon.

## Understanding apps

### Permissions

Apps may require certain permissions in order to work on your subreddit. These permissions are listed on the app detail pages in the Community Apps directory.

Permissions fall in one of three categories.

CategoryDescriptionUIPermissions the app needs for the UI elements it uses.User data handlingPermissions the app needs for the way it manages user data.Mod permissions (required)Permission the app needs to create an app account with everything permissions on your subreddit.

You can see the permissions an app requires on the app details page, install details page, and in the CLI.

### App accounts

Each app has an “app account”’ which is basically a user account for the app. The app account may take mod actions, write posts/comments, or send messages programmatically. These accounts are not human-operated or logged into.

Currently, app accounts are granted full mod permissions. In the future they will be granted more granular permissions based on the actions they need to take.

### Configuration settings

Some apps have settings that let you control how the app is configured to work on your subreddit. You can enable a specific setting or select options the developer provided to further customize your subreddit’s experience.

## How to install an app

Go to the Apps directory and select an app. This opens the app detail page. Click the red Install button, select the subreddit you want to add the app to, and presto! You’ve just installed an app.

## Safety

### Data privacy

Each installation of an app has its own data storage. This means that the data used by the app cannot interact with or share data with other communities, or with other apps . If the app you are installing uses external web services, the app will come with a separate privacy agreement with the developer.

If you uninstall an app from a subreddit, your app history will be lost. Be sure you want to remove an app before clicking "uninstall," because you won't be able to retrieve the data or settings if you reinstall the app at a later date.

### App review

Admins review the source code and test functionality of every app made publicly available. Apps going through major updates or with greater security risk go through the review process for each new version.

### Reporting an app

If you believe an app is in violation of Reddit’s sitewide content policies, is creating issues, or otherwise having negative impacts to communities it’s installed in, please contact our team via r/modsupport.


<!-- ============ /docs/guides/launch/launch-guide ============ -->

> source: https://developers.reddit.com/docs/guides/launch/launch-guide

- 
- Launch Guide

# Launch your app

Once your app is ready, you can launch it to users and moderators across Reddit. This guide outlines what “launch-ready” means and the steps you need to take to submit your app for review.

Polished apps may also apply for Reddit featuring, which includes on-platform promotion and distribution support. Make sure to read this guide before submitting your app.

warning
Our team pauses all app reviews during certain holiday periods each year. Please see community announcements in r/Devvit and Discord for specific limited support dates.

## When is an app ready to be launched?

Apps should be polished and stable before launch. Ensure your data schema is scalable and your UIs are clean and accessible, as quality and performance directly impact organic distribution and adoption.

Before submitting your app for review, be sure to:

- Test all functionality across mobile and web.

- Test from multiple accounts (developer, moderator, regular user), since permissions differ.

- Have a stable prototype with clear UX flows.

We also recommend getting feedback from the community:

- All apps:

- Cross-post your post to r/Devvit using the Feedback Friday flair.

- Share your app in the #ideas-and-feedback channel in the Reddit Devs Discord.

- Games:

- Cross-post gameplay posts to r/GamesOnReddit with the Feedback flair.

- Mod Apps:

- Share your app in the #mod-chat Discord channel for moderator-specific feedback.

If your app is a game, ensure the experience:

- Works across platforms with responsive design.

- Includes a custom launch or first screen.

- Avoids inline scrolling (scrolling inside inline webviews is prohibited).

- Has a dedicated, non-test subreddit (e.g., r/Pixelary).

- Is immediately understandable to new users.

Launching your app signals to Reddit’s algorithmic feeds that it is ready for broader distribution. Engagement — clicks, dwell time, and voting — determines your organic reach.

## How to launch an app

Apps are submitted for review through the CLI. To launch your app:

- 
Add a user-friendly overview in your app’s `README.md`.

- 
Run `npx devvit publish`.

You can optionally choose the version bump type with `--bump`:

- `npx devvit publish --bump major`

- `npx devvit publish --bump minor`

- `npx devvit publish --bump patch` (default)

`--bump` accepts only `major`, `minor`, or `patch`, and cannot be used with `--version`.

If you prefer to set a specific version directly, use `--version`:

- 
`npx devvit publish --version 1.0.1`

`--version` must be a stable version (for example, `1.0.1`), prerelease versions are not allowed, and it cannot be used with `--bump`.

Once submitted, your app enters Reddit’s review queue. Our team evaluates your code, example posts, and app documentation.

You will receive email confirmation when your app is approved. If we need more information, a team member may contact you via Modmail or Reddit chat.

Because you must run `npx devvit publish` for every version you want to launch, we recommend batching updates into weekly (or less frequent) releases.

Review times vary. We aim to review most apps — especially version updates — within 1–2 business days. New apps, apps with policy ambiguity, or apps using higher-risk features (e.g., payments, fetch) may require more time.
If you haven’t heard from us after a week, please reach out in Discord or via r/Devvit Modmail.

Ensuring your app complies with all Devvit Rules will streamline review.

By default, published apps are unlisted, meaning other communities cannot install them. This is ideal for games and community-specific tools.

## How to list your app for any community to install

If your app is a general-purpose moderation tool, community utility, or otherwise broadly applicable, you can request to list it in the App Directory. Listing makes your app installable by any moderator.

Publicly listed apps must include a detailed `README.md` with:

- A comprehensive app overview.

- Installer-facing instructions.

- Changelogs for major updates.

To list your app:

- Run `npx devvit publish --public`

- Once approved, it will appear in the Apps Directory for any community to install.

We do not recommend listing apps built for a single subreddit, as this may confuse moderators and clutter the directory.

## Resources

- Questions? Join our Discord or post in r/Devvit.

- Review the Devvit Rules before publishing.

- Learn more about how to earn from your apps.


<!-- ============ /docs/guides/launch/feature-guide ============ -->

> source: https://developers.reddit.com/docs/guides/launch/feature-guide

- 
- Feature Guide

# Get featured

Reddit celebrates creative games and experiences built by developers from our global community. Our Featuring Program does this by connecting exciting new apps with millions of active redditors.

Once your game has been launched, you may be the perfect candidate for our Featuring Program. As part of this program, Reddit works with developers to accelerate their game distribution and viewership.

Games that see great engagement as they grow will be featured across more prominent surfaces, which can expedite their qualification for Reddit Developer Funds, where developers can make up to $167,000 per app.

Learn how your game can be featured across Reddit and reach thousands of players.

## What is featuring?

Whether you're prototyping an early version of your first Reddit game or launching a polished experience to a wide audience, you have an opportunity to be featured. Our mission is to help developers grow by connecting their work with the Reddit users that will love it. Featuring selections are curated by our team and refreshed regularly to spotlight innovation, polished play, and player engagement.

Note that our top featuring slots are reserved for games that are of professional quality, as well as games that see exceptional engagement as they grow (CTR, dwell times, positive user engagement, retention).

Once your game is part of the program, it will be rotated in and out of featuring slots to support curatorial diversity.

## How to get featured

Once your game has been published and approved, it may be considered for the Featuring Program. You can also apply directly for consideration using the Featuring Request Form.

Please ensure you read this guide — especially the requirements and considerations — in its entirety before submitting your game.

Games that see organic growth are also likely to be scouted by our team for featuring.

## Ways we highlight developers

Reddit features games and developers across multiple discovery surfaces to help players find new favorites:

- Games Feed. The Games Feed showcases playable experiences directly within Reddit. When featured, games are rotated into a list of games that is algorithmically served to users visiting the feed.

- Community Drawer. Our lefthand drawer provides an easy access point for any redditor to see a mix of recently played games and curated popular games.

- Home Feed boosting. One selected game per week is given an extra algorithmic boost in user home feeds, reaching broad audiences.

- r/GamesOnReddit. The curated r/GamesOnReddit banner highlights new and trending games for Reddit players.

- Developer stories. The r/devvit community and Devvit blog regularly highlight developer journeys, tips, and behind-the-scenes insights. Some developers will also be tapped for key Reddit marketing and PR materials.

## Featuring tiers

TierDescriptionFeaturing SpotsWho It's ForLevel of PolishApproximate Impressions*DistributedGames get initial exposure on r/GamesOnReddit featuringCross-posted by Reddit, pinned banner on r/GamesOnRedditDevelopers seeking first playersEarly builds of launched appsThousandsPromotedPolished games selected to gain more visibility and engagementGames Feed listing, more visibility in r/GamesOnReddit launch padDevelopers ready to expand their reachPolished, working seamlessly across all platformsTens of thousands of impressionsHighlightedHigh-performing games that drive significant player engagementGames Feed top positions, added to Community Drawer "recently played" or one of the popular slotsDevelopers with highly polished, iterated gamesHighly polished, optimized for scale and retentionHundreds of thousands of impressionsHeroTop-tier, standout games featured broadly across RedditGames Feed highlight, featured in Community Drawer, Home Feed highlightDevelopers with flagship-quality gamesPro quality, high retention and engagementMillions to tens of millions of impressions

*This is a rough estimate and does not reflect what any particular game will reach at this tier.

Games can be promoted to our highest featuring tiers if they see exceptional engagement and retention at lower featuring levels. Our team looks at CTRs, day 1 and day 3 retention, dwell time, as well as qualitative user feedback. We hope to add more of these metrics to the developer analytics panel in the coming months.

## Featuring requirements

In order to promote a game, we need to ensure the experience for redditors meets certain quality criteria. To be featured at any level you must have:

- A compelling first screen. Your game must have a custom first screen.

- Cross platform support. Your game's viewport must be accessible and clean on both mobile and desktop platforms.

- Self-explanatory design. Anyone should be able to click into your post and have the context needed to learn, play, or participate.

- Responsive design. All screens should be visible within fullscreen, mobile, and desktop. Avoid unnecessary scrolls. Scrolling within inline webviews is prohibited.

## Featuring considerations

Our goal is to feature games that feel great to play and reflect Reddit's creative spirit. With each featuring tier, the quality of featured apps becomes more stringent. Beyond the basic featuring requirements, we want to see:

- Standout user experience. Fast, intuitive, and responsive gameplay across devices.

- Design and polish. Cohesive visuals, appealing splash screens, and optimized mobile layouts.

- Community engagement. Features that encourage posts, comments, and user-generated content.

- Innovation. Fresh mechanics or concepts that make Reddit play unique.

- Performance and retention. Stable technical performance and meaningful player return rates.

- Iteration. Regular updates and responsiveness to player feedback.

## Celebrating your app

Games that reach featured tiers often see thousands of daily players and dedicated community followings. When your game is featured, you'll receive promotional visibility through banners, feeds, and subreddit posts, as well as the opportunity to share your success across social channels and developer communities.

See stories about successful games like Honk and Syllocrostic, which Reddit acquired after successful featuring.


<!-- ============ /docs/guides/faq ============ -->

> source: https://developers.reddit.com/docs/guides/faq

- 
- FAQ

# FAQ

### Getting Started
Do I need a Reddit API key, client ID, or client secret to build with Devvit?No. If you're building a Devvit app, you don't need to create a traditional Reddit app at `reddit.com/prefs/apps` or manage API keys yourself.Instead, start from the App quickstart or create a project at developers.reddit.com/new. During setup, you sign in with your Reddit account and connect it to Reddit developers. Devvit handles authentication for your app.To read or write Reddit content from a Devvit app, enable the Reddit capability described in the Reddit API Overview. note
If you're building an external script, bot, or website outside Devvit, that's a different authentication flow from the one documented here.

Where do I start building a Devvit app?The fastest path is the App quickstart, which walks you through creating a project, connecting your Reddit account, and starting a playtest environment.If you already know what you want to build, you can also start with:

- Quickstart for Games

- Quickstart for Mod Tools

- Quickstart for Unity

- Quickstart for GameMaker

How do I log in, and how do I know I am authenticated?Use the CLI to sign in with your Reddit account:
```
npx devvit login
```

To confirm which account is currently authenticated, run:
```
npx devvit whoami
```

After login, Devvit stores your access token locally at `~/.devvit/token` and refreshes it automatically while you use the CLI.For command details, see the `devvit login` and `devvit whoami` sections of the CLI reference.

### Building and Testing
Can I test locally without uploading to Reddit?Not completely. Devvit apps run against Reddit, so the normal development flow uses a playtest subreddit rather than a purely local setup.The quickstart uses `npm run dev`, which starts a Devvit playtest session for you. If you need more control over that flow, see Playtest.If you're wondering why a purely local setup isn't enough, the quickstart calls this out directly: backend calls don't work when you test the app only locally.

Why does `npm run dev`, playtest, upload, or install fail?Most development errors fall into a few buckets:

- Authentication: make sure you're logged in with `npx devvit login`, then verify the current account with `npx devvit whoami`.

- Build output mismatch: if Devvit can't find `config.server.entry`, check that your built server file matches the path in `devvit.json`, and that your server build outputs a CommonJS bundle. The best references are Devvit configuration and Vite.

- Config validation: if `devvit.json` complains about invalid fields, extra properties, or settings shapes, validate it against the schema and configuration rules in Devvit configuration.

- Fetch or domain errors: if fetch is disabled or a domain is rejected, configure `permissions.http` correctly and review the rules in HTTP fetch.

- Runtime failures during playtest or install: use Playtest and Logs and Debugging together so you can see the failing endpoint or trigger.

One other common gotcha: Devvit projects use `vite build --watch` rather than a normal `vite dev` server. The Vite guide explains the expected setup.

How do I update the Devvit CLI?Prefer updating the project-local CLI dependency instead of relying on a global install. Update `devvit` in your project, then run `npx devvit update app` so your `@devvit` packages match the CLI.For the current commands and workflow, see Devvit CLI and the update notes in Changelog.

How do I update my app version?Updating the CLI and publishing a new app version are separate steps. Your app version changes when you publish: `npx devvit publish` creates the next launch version, and you can control that with `--bump` or `--version` as described in Launch your app.After that, the subreddit still needs to be on the version you want installed. Publishing a new version doesn't automatically update every subreddit. Use `devvit install` or open your app in the App Directory and, under Installed in communities, use the blue Update button for the subreddit that's out of date.

I published and it says a new Devvit version is available. Do I need to upgrade?Not necessarily. If you're within 2–3 versions of the current Devvit release, your app will continue working as-is. The version notice is informational — it doesn't mean your app is broken or blocked from publishing.Staying reasonably current is good practice, though. It gets you access to the latest fixes and capabilities. When you're ready, run `npx devvit update app` to bring your project's `@devvit` packages in line with the latest CLI, then test in playtest before publishing the update.For upgrade steps, see Devvit CLI and the Changelog.

What is the difference between `npx devvit upload` and `npx devvit publish`?Use `npx devvit upload` when you want a private uploaded build for yourself, and use `npx devvit publish` when you're ready to submit a version for launch review. In practice, playtest is still the normal dev loop, `upload` is useful for a private installable build, and `publish` is the launch step documented in Launch your app.For command syntax, see Devvit CLI. For the review and launch flow, see Launch your app.

What should I do after playtest when I am ready to launch?Before launch, make sure the app is stable across mobile and web, test with multiple accounts, and add an installer-friendly `README.md`. Then follow the publish flow in Launch your app.If you're just ending a playtest session, remember that the latest playtest install remains in place until you change installs. Playtest and `devvit install` cover that handoff.

How long does it take to get my app published?Most app versions are reviewed within 1–2 business days. New apps or versions that include higher-risk features may take longer. Features that commonly extend review time:

- Payments: apps using the payments capability go through additional policy review.

- `runAs: 'USER'`: user action permissions require explicit approval as part of the review.

- External fetch domains: new domain requests are reviewed separately and can add time (see HTTP Fetch Policy).

To keep review moving:

- Make sure your `README.md` is clear, accurate, and up to date.

- Ensure your app complies with the Devvit Rules.

- If your app uses fetch domains, document them in a "Fetch Domains" section of your README.

If you haven't heard back after a week, reach out in the Devvit Discord or via r/Devvit Modmail. For the full publish flow, see Launch your app.

How do I install my app on another subreddit?If you moderate the destination subreddit, use `devvit install` to install a specific app or version on that community. That's the direct CLI path when you want to move beyond the playtest subreddit or test on another subreddit you control.If the goal is broader distribution, follow Launch your app so moderators can install the approved app in the appropriate way for its visibility level.

What is the difference between unlisted and public apps?Published apps are unlisted by default. That's usually the right fit for games and single-community tools. If you want your app to appear in the App Directory so any moderator can install it, use `npx devvit publish --public` and follow the listing guidance in Launch your app.Public apps should look launch-ready: the launch docs call for a detailed installer-facing `README.md`, and game launch guidance expects a custom launch or first screen rather than a rough default experience.

### App Features
What is an interactive post in Devvit?An interactive post is a Reddit post created for an app experience rather than a plain text-only post. That means creating the post with `reddit.submitCustomPost()` and defining how it launches through entry points, launch screens, and optional `postData`. See Interactive posts overview and Creating a custom post.

Why is my post just text instead of an interactive app post?If you call `submitPost()` with normal `text`, you're creating a regular Reddit post. To create an interactive app post, use `submitCustomPost()` and point it at your configured entry point instead. The Interactive posts overview is the clearest starting point for that distinction.

What is Devvit Web?Devvit Web is the current client/server app model for building Devvit apps with standard web tools like React, Phaser, or Three.js. It's a normal web app plus server endpoints plus `devvit.json` configuration, with Reddit capabilities split between client APIs, server APIs, and config. See Devvit Web overview.

I got a notice that Blocks is deprecated. What do I need to do?Blocks is being replaced by Devvit Web. The path depends on how your app is built, but here's what to check first:

- `devvit.yaml`: If your project still has a `devvit.yaml`, replace it with a `devvit.json`. See Migrating Blocks/Mod Tools to Devvit Web for the updated config format and steps.

- `Devvit.addCustomPostType()`: This is the core Blocks API and is deprecated. Move your post rendering to a `client` entry in `devvit.json`, backed by a standard HTML, React, or other web app.

- `submitCustomPost()` with `preview`: The `preview` field (used to render a Blocks component as the post preview) is no longer the right pattern. Use `post.entrypoints` in `devvit.json` to define your inline and expanded views as HTML entry points instead.

- `useWebView`: If your app launched a web view from inside Blocks, migrate to Devvit Web. See Migrating from useWebView to Devvit Web.

If your app uses only Blocks without a web view, Migrating Blocks/Mod Tools to Devvit Web is the quickest path. If your app has a web view, start with Migrating from useWebView to Devvit Web.

Where do I customize the first screen or launch screen?For current Devvit Web apps, customize the first screen through your `post.entrypoints` in `devvit.json` and the HTML, CSS, and client code for those entry files. The main references are Launch overview, View modes and entry points, and Launch screen customization.

Should I use the legacy `splash` field or HTML launch entry points? warning
Deprecation notice: The `splash` parameter in `submitCustomPost()` and Blocks-based launch screens will be deprecated in June. Migrate to HTML-based entry points before then.

Use HTML launch entry points for all new and existing work. The older `splash` parameter is deprecated in favor of entrypoint-based launch screens and `entry` selection in `submitCustomPost()`. If you're updating an older app, start with Migrating from Splash Screens.

How do I handle scrolling and touch gestures in inline vs expanded mode?Treat inline and expanded mode differently. Inline should avoid scroll traps and heavy gesture hijacking so users can still scroll past the post, while expanded is the right place for richer touch interaction and more space.There's no single canonical viewport size for all devices. Design responsively, test in UI Simulator, and use the current launch-mode docs for inline vs expanded behavior in View modes and entry points and Launch screen customization.

How do I add images that ship with my app?Put static images in your client `dist/` directory when they should ship with the app version, such as logos, backgrounds, or other bundled art. Reference them directly from your web client (for example via `<img src="/logo.png" />`).

How do user image uploads work in Devvit?The simplest path is a form field with `type: 'image'`, which returns a Reddit-hosted image URL when the user submits it. For custom flows like screenshots or generated images, send the data to your server and upload it with Media uploads.See Forms and Media uploads for the supported formats and size limits.

What image URLs can I use in a Devvit app?The documented display paths are bundled client assets, Reddit-hosted URLs, and SVG data URLs, depending on the UI surface. If your source image lives somewhere else on the web, don't assume you can hotlink it directly into the UI. Upload it first so Reddit hosts the image, then use the returned URL. See Media uploads.

What is `postData`, and when should I use it instead of Redis?Use `postData` for small shared JSON attached to a single post, like lightweight game state or configuration that all viewers need to read. The docs cap it at 2 KB per post and recommend Redis for larger or more persistent data patterns.

How do I access or update `postData`?Set `postData` when creating the post, then read it from `context.postData` on either the client or server side. To update it later, fetch the post and call `setPostData()`. The important gotcha is that `setPostData()` replaces the whole object, so merge existing fields first. See Post data.

How do I build a leaderboard with Redis?The standard Devvit pattern is to build leaderboards with Redis sorted sets. Use Redis for score storage and ranking, use Scheduler for daily or periodic resets, and prefer realtime updates over constant polling when you need a live leaderboard.Redis is the right storage layer, but the exact schema depends on whether you need daily, weekly, or all-time rankings. Redis is the best starting point.

Can a menu action create a new post?Yes. Define the menu item in `devvit.json`, implement the server endpoint it calls, and create the post from that route. The pattern is documented across Menu actions and Interactive posts overview.

How do I automate daily or scheduled game posts?Use Scheduler for cron-style recurring jobs or one-off jobs declared in `devvit.json`, then handle the matching `/internal/...` endpoint in your server code. The scheduler docs explain the plumbing; the post creation step still uses the normal Reddit APIs like `submitCustomPost()`.

How do I post or comment as the user instead of the app?Add the required `permissions.reddit.asUser` entries in `devvit.json`, then call the supported Reddit APIs with `runAs: 'USER'`. The main doc for this is User Actions, which also explains the review requirements, explicit opt-in rules, and `userGeneratedContent` expectations.

Why does `runAs: 'USER'` still post as the app during playtest?Before the app version is approved, user actions aren't enabled for everyone. During playtest or other unapproved versions, `runAs: 'USER'` falls back to the app account for most users, while actions taken by the app owner are attributed to the owner's username. After publishing and approval, it operates on behalf of the user for all users. See User Actions.

How do I set or update user flair and post flair?Devvit supports both user flair and post flair through the Reddit API client.

- For a new post, use the submit options documented in CommonSubmitPostOptions, including `flairId` or `flairText`.

- For an existing post, use the flair methods on RedditAPIClient, such as `setPostFlair()` and `removePostFlair()`.

- For a user, use `setUserFlair()`, `removeUserFlair()`, or `setUserFlairBatch()` on the same client.

If you're reading flair back from a post, note that post flair and author flair are different fields. The Post model exposes `flair` for the post and `authorFlair` for the post author.If you need to react to flair changes, Devvit documents an `onPostFlairUpdate` trigger for post flair changes. Also note that the Devvit test tool doesn't yet support the Flair service.

How do I get a user's username or snoovatar?If you only need the current user's name, prefer `getCurrentUsername()` over fetching the full user object.If you need more profile information, use `getCurrentUser()` from the Reddit API client. To get a snoovatar URL, use `reddit.getSnoovatarUrl(username)` or `user.getSnoovatarUrl()` on the User model.Some handlers also expose experimental identity fields like `username` and `snoovatar` on BaseContext, but the Reddit client methods are the clearest documented path.

How do I handle external links in Devvit?Use Devvit navigation APIs to open links rather than treating this like external fetch. For app navigation, see Navigation, which covers `navigateTo` and the confirmation flow for external URLs.If you actually need remote data or remote media, that's a different path: use HTTP fetch for approved server-side fetches, and Media uploads when you need a Reddit-hosted media URL.

How do I update my app profile settings?You can edit the display name, about description, and mature flag (18+) fields in the Developer Portal under Developer Settings. Updates will appear in the Developer Portal and on the app's Reddit profile.

### Limits and Policies
What are the main storage, payload, and rate limits?There's no single limits page today, but these are the most commonly referenced numbers in the docs:

- Redis: 500 MB max storage per installation, 5 MB max request size, and 40,000 max commands per second.

- Devvit Web: 30 second max request time, 4 MB max payload size, and 10 MB max response size.

- Post data: 2 KB per post.

- Settings and secrets: 2 KB per setting value.

- Realtime: 1 MB maximum message payload and 100 messages per second per installation.

- Scheduler: up to 10 live recurring actions per installation, plus `runJob()` limits documented on that page.

If you need data to survive app updates, don't rely on browser `localStorage`. The Devvit Web overview recommends Redis for persistent storage across versions.

How long does it take to get my domain approved?Domain requests are reviewed separately from app publishing and can take up to 4 business days. If your app was approved but a requested fetch domain wasn't yet granted, the domain review may still be in progress.To make approval go smoothly:

- Use exact hostnames only — no wildcards (`*.example.com`), no protocols (`https://`), and no paths (`api.example.com/webhooks`).

- Add a "Fetch Domains" section to your `README.md` listing each domain and explaining why you need it. The expected format is documented in HTTP Fetch Policy.

- Include links to your Terms and Conditions and Privacy Policy in your app details form.

Before submitting, check the global fetch allowlist — if your domain is already listed there, no separate request is needed. Personal domains (e.g., `personaldomain.com`) aren't approved.

What screen sizes should I design for?There's no single published pixel size for every device or view mode. Build responsive layouts and test them across the views supported by the UI Simulator: mobile, desktop, and fullscreen.Inline and expanded mode behave differently: expanded is the larger experience, with more room for rich interaction, while inline should stay lightweight and feed-friendly.Start with mobile-first assumptions and validate in the simulator before hard-coding dimensions. The best references are View modes and entry points, Launch screen customization, and UI Simulator.

Can I build NSFW games or apps with Devvit?There's no separate NSFW platform guide in these docs, so the main source of truth is Devvit Rules plus Reddit's linked platform policies.The rules explicitly require labels or age-gating before exposing users to graphic, sexually explicit, or otherwise mature content. Static assets and uploaded media are also subject to the same safety checks and policy review described in Media uploads.If your app idea depends on adult content or NSFW communities, review those rules first and get clarification in the Devvit Discord before you ship.

### Help and Next Steps
Where do I go for help if I am stuck?For help from the Devvit team and community:

- Join the Devvit Discord

- Ask in `r/Devvit`

- File bugs or feature requests in the public issues tracker

How do I uninstall or remove a Devvit app from a subreddit?Use the CLI to inspect installs and uninstall from a subreddit. The current docs point to `list installs` and `uninstall` in Devvit CLI.There's also a manual path in the App Directory. Open your app there, then either use Installed in communities to select a subreddit and choose Remove from community, or scroll to the bottom of the app page and use Archive if you want to archive the app itself.Be careful: uninstalling from a subreddit can remove that installation's stored data and settings. See Mod resources for the current warning about uninstall data loss.

What is Devvit MCP and how do I set it up?Devvit MCP is the bridge used by supported coding tools and agents to search Devvit docs and, in some setups, work with Devvit workflows from your editor. The setup docs live in Using AI Tools.If you're configuring Cursor, VS Code Copilot, Claude Code, or Claude Desktop, start there instead of duplicating the JSON in this FAQ. Use the AI tools guide for the exact MCP config and supported tools.

What should I read next?

- To understand Devvit's built-in Reddit access, read the Reddit API Overview

- To learn the CLI commands you'll use most often, read Devvit CLI

- To develop against a subreddit and inspect logs, read Playtest and Logs and Debugging


<!-- ============ /docs/guides/ai ============ -->

> source: https://developers.reddit.com/docs/guides/ai

- 
- Using AI Tools

# AI Tools

Devvit ships with first class support for common AI tools and patterns.

## LLMs.txt files

- https://developers.reddit.com/docs/llms.txt: Most useful for pasting into the chat UI of common LLMs BEFORE your prompt. Place your prompt last as models are auto-regressive.

- https://developers.reddit.com/docs/llms-full.txt: Useful for pasting into the chat UI of LLMs with large context windows (Gemini, Claude Sonnet 4). This lets you chat with the docs instead of reading them. It's easy to pollute your context if your using this for coding so we recommend only using this to learn about Devvit or plan. To execute, use `llms.txt` as most modern LLMs can tool call websites.

## MCP

Devvit ships with a MCP server to assist with agent driven development. There are two commands at the moment:

- `devvit_search`: Executes hybrid search over all of our docs. This is preferable to pasting in tons of docs since it can be more specific and lowers the risk of polluting your context.

- `devvit_logs` [experimental]: Queries for logs of your app and a subreddit to place into an agent's context. It can be fun any useful, and shows a glimpse of the future of AI Devvit! Try this after MCP is turned on in your agent, "find a bug in my app deployed to the subreddit <YOUR_SUBREDDIT_NAME> from the past week and a fix it". It might not work, but when it does, magic!

### Cursor

Note that React, ThreeJS, and Phaser ship with first class support. All you have to do is run a template from /new in cursor and you will see a popup at the bottom-left corner to enable.

- 
In your project, ensure a `.cursor` directory exists at the root. Create it if necessary.

- 
Inside `.cursor`, create or open the `mcp.json` file.

- 
Paste the following configuration into `mcp.json`:

mcp.json

```
{ "mcpServers": { "devvit": { "command": "npx", "args": ["-y", "@devvit/mcp"] } }}
```

- 
Save the file.

- 
Check Cursor's Settings/MCP section. The Devvit MCP server should show an active status (green indicator). You might need to click "Refresh" if it doesn't appear immediately.

### Claude Code

```
claude mcp add devvit -- npx -y @devvit/mcp
```

Things should work after that!

### Claude Desktop

- Open the Claude desktop application and go to Settings.

- Navigate to the Developer tab and click Edit Config.

- Add the Devvit server configuration:

```
{ "mcpServers": { "devvit": { "command": "npx", "args": ["-y", "@devvit/mcp"] } }}
```

- Save the configuration file and restart the Claude desktop application.

- When starting a new chat, look for the MCP icon (hammer); the Devvit server should now be listed as available.

### Visual Studio Code (Copilot)

- 
Ensure your project root contains a `.vscode` directory. Create one if it's missing.

- 
Create or open the `mcp.json` file within the `.vscode` directory.

- 
Insert the following configuration:

mcp.json

```
{ "servers": { "devvit": { "command": "npx", "args": ["-y", "@devvit/mcp"] } }}
```

- 
Save `mcp.json`.

- 
In the Copilot chat panel within Visual Studio Code, ensure you're in "Agent" mode. The tool icon should now indicate that Devvit MCP tools are available for use.

Refer to the official Copilot documentation for further details on VS Code MCP integration.

### Testing the Connection

With your AI tool configured, you should now be able to leverage the Devvit MCP server. A good way to test this is to ask your AI assistant a question that requires accessing Devvit resources, for example: "Search the Devvit docs for information on redis."

If you encounter problems, refer to the official Devvit documentation or reach out in the Discord.


================================================================================
# Guides — dev tools
================================================================================



<!-- ============ /docs/guides/tools/devvit_cli ============ -->

> source: https://developers.reddit.com/docs/guides/tools/devvit_cli

- 
- Development Tools
- Devvit CLI

# Devvit CLI

The Devvit CLI enables you to create, upload, and manage your apps. It's the bridge between your codebase and Reddit.

note
We collect usage metrics when you use the Devvit CLI. For more information, see Reddit’s Developer Terms and the Reddit Privacy Policy. You can opt out at any time by running `npx devvit metrics off`.

## CLI Usage

### devvit create icons

Bundles all `SVG` files in the `/assets` folder into a new file (`src/icons.ts` by default). Enabling you to import local SVG assets in your app code.

#### Usage

```
$ npx devvit create icons [output-file]
```

#### Optional argument

- 
`output-file`

Path to the output file. Defaults to `src/icons.ts`.

#### Generating the SVG bundle file

```
$ npx devvit create icons$ npx devvit create icons "src/my-icons.ts"
```

#### Using the SVG files in app code

src/client/App.tsx

```
import Icons from './my-icons.ts';export const App = () => ( );
```

### devvit help

Display help for devvit

#### Usage

```
$ npx devvit help
```

### devvit install

Install an app from the Apps directory to a subreddit that you moderate. You can specify a version to install or default to @latest (the latest version).

#### Usage

```
$ npx devvit install [app-name]@[version]
```

#### Required arguments

- 
`subreddit`

Name of the installation subreddit. The "r/" prefix is optional.

#### Optional arguments

- 
`app-name`

Name of the app to install (defaults to current project).

- 
`version`

Specify the desired version (defaults to latest).

#### Examples

```
$ npx devvit install r/mySubreddit$ npx devvit install mySubreddit my-app$ npx devvit install r/mySubreddit my-app@1.2.3$ npx devvit install r/mySubreddit @1.2.3
```

### devvit list apps

To see a list of apps you've published

#### Usage

```
$ npx devvit list apps
```

### devvit list installs

To see a list of all apps currently installed on a specified subreddit.

If no subreddit is specified, you'll get a list of all apps installed by you.

#### Usage

```
$ npx devvit list installs [subreddit]
```

#### Optional argument

- 
`subreddit`

Name of the subreddit to look up installations for. The "r/" prefix is optional.

#### Examples

```
$ npx devvit list installs$ npx devvit list installs mySubreddit$ npx devvit list installs r/mySubreddit
```

### devvit login

Login to Devvit with your Reddit account in the browser.

#### Usage

```
$ npx devvit login [--copy-paste]
```

#### Optional argument

- 
`--copy-paste`

If present, user will copy-paste code from the browser instead of the localhost.

### devvit logout

Logs the current user out of Devvit.

#### Usage

```
$ npx devvit logout
```

### devvit logs

Stream logs for an installation within a specified subreddit. You can see 5,000 logs or up to 7 days of log events.

#### Usage

```
$ npx devvit logs [app-name] [-d ] [-j] [-s ] [--verbose]
```

#### Required arguments

- 
`subreddit`

The subreddit name. The "r/" prefix is optional.

- 
`app-name`

The app name (defaults to working directory app).

#### Optional arguments

- 
`-d <value>, --dateformat <value>`

Specify the format for rendering dates. Defaults to `MMM d HH:mm:ss` (Jan 15 18:30:03). See more about format options here.

- 
`-j, --json`

Output JSON for each log line

- 
`-s <value>, --since <value>`

Specify how far back you want the log streaming to start. Defaults to a `0m` (now) if omitted.

Supported format:

- `s` seconds

- `m` minutes

- `h` hours

- `d` days

- `w` weeks

For example `15s`, `2w1d`, or `30m`.

- 
`--verbose`

Displays the log levels and timestamps when the logs were created.

#### Examples

```
$ npx devvit logs r/mySubreddit$ npx devvit logs mySubreddit my-app$ npx devvit logs mySubreddit my-app --since 15s$ npx devvit logs mySubreddit my-app --verbose
```

### devvit new

Create a new app.

#### Usage

```
$ npx devvit new [directory-name] [--here]
```

#### Optional arguments

- 
`directory-name`

Directory name for your new app project. This creates a new directory for your app code. If no name is entered, you will be prompted to choose one.

- 
`--here`

Generate the project here and not in a subdirectory.

#### Examples

```
$ npx devvit new$ npx devvit new tic-tac-toe$ npx devvit new --here
```

### devvit playtest

Installs your app to your test subreddit and starts a playtest session. A new version of your app is installed whenever you save changes to your app code, and logs are continuously streamed. Press `ctrl+c` to end the playtest session. Once ended, the latest installed version will remain unless you revert to a previous version using `devvit install`. For more information, see the playtest page.

#### Usage

```
$ npx devvit playtest
```

#### Optional argument

- subreddit
Name of a test subreddit with less than 200 subscribers that you moderate. The "r/" prefix is optional.

If no subreddit is specified, the command will use the first available option from:

- DEVVIT_SUBREDDIT environment variable

- dev.subreddit field in devvit.json

- The playtest subreddit stored for your app

If none exist, a new playtest subreddit will be automatically created.

### devvit settings list

List settings for your app. These settings exist at the global app-scope and are available to all instances of your app.

#### Usage

```
$ npx devvit settings list
```

### devvit settings set

Create and update settings for your app. These settings will be added at the global app-scope.

#### Usage

```
$ npx devvit settings set 
```

#### Example

```
$ npx devvit settings set my-feature-flag
```

### devvit uninstall

Uninstall an app from a specified subreddit.

#### Usage

```
$ npx devvit uninstall [app-name]
```

#### Required argument

- 
`subreddit`

Name of the subreddit. The "r/" prefix is optional. Requires moderator permissions in the subreddit.

- 
`app-name`

Name of the app (defaults to the working directory app).

#### Examples

```
$ npx devvit uninstall r/mySubreddit$ npx devvit uninstall mySubreddit$ npx devvit uninstall mySubreddit my-app
```

### devvit update app

Update @devvit project dependencies to the currently installed CLI's version

#### Usage

```
$ npx devvit update app
```

### devvit upload

Upload an app to the App directory. By default the app is private and visible only to you.

#### Usage

```
$ npx devvit upload [--bump major|minor|patch|prerelease] [--copyPaste]
```

#### Optional arguments

- 
`--bump <option>`

Type of version bump (major|minor|patch|prerelease)

- 
`--copyPaste`

Copy-paste the auth code instead of opening a browser

### devvit version

Get the version of the locally installed Devvit CLI.

#### Usage

```
$ npx devvit version
```

### devvit view

Shows you the latest version of your app and some data about uploads. Includes an optional --json flag to get information in JSON format.

#### Usage

```
$ npx devvit view [APPSLUG[@VERSION]] [--json] [version]
```

### devvit whoami

Display the currently logged in Reddit user.

#### Usage

```
$ npx devvit whoami
```

## Updating the CLI

There are currently two ways to update the Devvit CLI, depending on how you installed it.

How do I know how I installed the CLI?The easiest way to check how you installed the CLI is to run this command in your terminal:
```
npm list -g --depth=0
```

If you see a line that starts with `devvit@`, it means you have the CLI installed globally. If
not, you likely have it installed as a dev dependency in your project - you can check this by
looking for `devvit` in your project's `package.json` file under the `devDependencies` section.
(If you don't see it in either place, you may not have the CLI installed at all, in which case,
you can follow the quickstart guide to install it.)

### 1. If you installed the CLI as a dev dependency

This is the recommended way to install the CLI, as it ensures that your project uses a specific
version of the CLI, and makes it substantially easier to both update the CLI, and know what version
of the CLI you're using.

To update the CLI, run the following command in your project directory:

```
npm install --save-dev devvit@latest
```

(Or, if you're using a different package manager, use an equivalent command to update the `devvit`
package to the latest version, and save it as a development dependency. DO NOT save it as a
regular dependency - we don't need the CLI code uploaded with your app!)

### 2. If you installed the CLI globally

If you installed the CLI globally, ideally, you should uninstall the global version and install it
as a dev dependency in your project instead. To do this, inside your project, run the following
commands:

```
npm uninstall -g devvitnpm install --save-dev devvit@latest
```

If you still want to keep the CLI installed globally, you can update it by running the following
command:

```
npm install -g devvit@latest
```

This will update the global version of the Devvit CLI to the latest version. However, please note
that this is not recommended, as it can lead to inconsistencies between the CLI version used in
your project and the global version. It's best to use the CLI as a dev dependency in your project
to ensure that you're always using the same version across different environments.


<!-- ============ /docs/guides/tools/playtest ============ -->

> source: https://developers.reddit.com/docs/guides/tools/playtest

- 
- Development Tools
- Playtest

# Playtest

You can use playtest to see how your app works on Reddit.

Code changes you save during the playtest will automatically update your app on the playtest subreddit. This lets you see your app updates in real time and creates logs using real data.

## Start a playtest

- Run `devvit upload` to add your app to the Apps directory. This automatically creates a playtest subreddit for you.

- Run `devvit playtest` to start your app on your default subreddit.

- The CLI will return the playtest subreddit link for your app.

## Playtest on an alternate subreddit

If you want to use an alternate subreddit (must have fewer than 200 subscribers) for your playtest, you can do this a couple of different ways:

- Run `devvit playtest [subreddit_name]`, or

- Set a default subreddit in one of these fields:

- DEVVIT_SUBREDDIT environment variable

- dev.subreddit field in devvit.json

If you set a default subreddit in your app, the `devvit playtest` command will use the default instead of the auto-generated subreddit.

## How do I find my playtest subreddit name?

Run `devvit playtest`. The CLI will output a link to your playtest subreddit

## About playtest subreddits

All playtest subreddits must have fewer than 200 subscribers.

The auto-generated playtest subreddit is created for you by u/devvit-dev-bot. This subreddit:

- Is private

- Makes you a moderator

- Has your app pre-installed

- Allows reddit admins to join your subreddit

note
If you need help, run `devvit playtest --help` for additional information.

## View logs

Playtest continuously streams logs for your app installation. This will show in the output of your terminal where the playtest is running. Check out logs to learn more.

## Connect to client-side logs

To enable client-side logs, add the`?playtest=<app_name>` query parameter to your subreddit URL (e.g. http://reddit.com/r/devvit?playtest=pixelary-game). This allows client side logs to stream into Devvit playtest logs and live reloads your browser when there are changes.

note
This url is also shown in your terminal when you start a playtest.

## End a playtest

Press Ctrl + C to exit the playtest.

Exiting the playtest does not uninstall the playtest version or revert your app back to a previous version. The playtest version you just tested will remain installed on the test subreddit.

## Revert your app

If you want to revert back to the latest non-playtest version of the app, run the following command from within your project directory:

```
devvit install 
```

If you want to revert to a different version of your pre-playtest app, you can specify which version using the `install` command. Entering app name is optional if you are running this command from within your project directory.

```
devvit install [@version]
```

## Upload your app

If you’re satisfied with your playtest app and want to upload an installable version, run:

```
devvit upload
```

This will automatically bump your app version to the next patch release. For example, if your playtest version is 0.0.1.6, the upload command will remove the playtest version increment and change your app version to 0.0.2.

Once you publish your app to the Apps Directory, it will be available for users to install.


<!-- ============ /docs/guides/tools/logs ============ -->

> source: https://developers.reddit.com/docs/guides/tools/logs

- 
- Development Tools
- Logs and Debugging

# Logs and Debugging

Stream log events from your installed app to your command line to troubleshoot your app. You can see 5,000 logs or up to 7 days of log events.

## Create logs

Use `console.log()`, `console.info()`, and `console.error()` in your server code to create logs. View them with `devvit logs` for installed apps, or add `--verbose` to include timestamps.

The following example creates a basic app with a menu action that creates a log when clicked.

devvit.json

```
{ "$schema": "https://developers.reddit.com/schema/config-file.v1.json", "name": "app-name", "server": { "dir": "dist/server", "entry": "index.cjs" }, "permissions": { "reddit": true }, "menu": { "items": [ { "label": "Create a log!", "location": "subreddit", "endpoint": "/internal/log-action", "forUserType": "moderator" } ] }}
```

server/index.ts

```
router.post("/internal/log-action", async (_req, res): Promise => { console.log("log-action"); res.json({ showToast: { text: "Log action", appearance: "success", }, });});
```

## Stream logs

To stream logs for an installed app, open a terminal and navigate to your project directory and run:

```
$ devvit logs 
```

You can also specify the app name to stream logs for from another folder.

```
$ devvit logs 
```

You should now see logs streaming onto your console:

```
=============================== streaming logs for my-app on my-subreddit ================================[DEBUG] Dec 8 15:55:23 Action called![DEBUG] Dec 8 15:55:50 Action called![DEBUG] Dec 8 15:57:29 Action called![DEBUG] Dec 8 15:57:32 Action called!
```

To exit the streaming logger, enter `CTRL + c`.

## Historical logs

You can view historical logs by using the `--since=XX` flag. You can use the following shorthand:

- `Xs`: show logs in the past X seconds

- `Xm`: show logs in the past X minutes

- `Xh`: show logs in the past X hours

- `Xd`: show logs in the past X days

- `Xw`: show logs in the past X weeks

The following example will show logs from `my-app` on `my-subreddit` in the past day.

```
$ devvit logs --since=1d
```

You will now see historical logs created by your app on this subreddit:

```
=============================== streaming logs for my-app on my-subreddit ================================[DEBUG] Dec 8 15:55:23 Action called![DEBUG] Dec 8 15:55:50 Action called![DEBUG] Dec 8 15:57:29 Action called![DEBUG] Dec 8 15:57:32 Action called!
```

To exit the streaming logger, enter `CTRL + c`.

## Playtest

While you are running `playtest` in a subreddit, you will also be streaming logs from that community in your command line.


<!-- ============ /docs/guides/tools/devvit_test ============ -->

> source: https://developers.reddit.com/docs/guides/tools/devvit_test

- 
- Development Tools
- Testing

# Testing with @devvit/test

The `@devvit/test` package provides utilities to write unit and integration tests for your backend logic with Vitest.

## Capability support

Out of the box, the test harness mocks many of Devvit's capabilities for you. Here's what's supported:

CapabilityStatusNotesRedis✅ SupportedPer-test isolation; transactions supportedScheduler✅ SupportedJobs are listed immediately; time does not advanceSettings✅ SupportedPer-test isolation; configurable defaultsRealtime✅ SupportedIn-memory recording of sent/received messagesMedia✅ SupportedIn-memory uploads with synthetic IDs/URLsNotifications✅ SupportedHTTP✅ Blocked by defaultNetwork calls throw; mock `fetch` to allowReddit API⚠️ Partially SupportedHelpful errors for unimplemented methodsPayments❌ Not Supported (yet)

You can use these capabilities inside your tests exactly as you do in production code.

## Getting started

The `@devvit/test` package provides a miniature Devvit backend on demand. Every time you call `test()`, the harness spins up a temporary, isolated test world in memory, including its own Redis, Reddit API, Scheduler, and other capabilities. This lets you write tests that verify your app's behavior in a production-like environment.

With that in mind:

- Write tests like production code: Call your services, save data to Redis, schedule jobs, and send realtime messages.

- Use mocks sparingly: You might still need stubs for third-party HTTP calls or unsupported Reddit APIs, but they should be used sparingly. The provided mocks should handle most cases automatically.

- Isolation is built in: Each test runs in its own world. You can reuse key names, IDs, or settings across tests without worrying about cleanup or one test affecting another. This also reduces the need for any life cycle hooks for tests like `beforeEach` and `afterEach`.

First, make sure you have `vitest` and `@devvit/test` installed in your project.

To get started, create a test instance using `createDevvitTest()`. This returns a Vitest `TestAPI` instance that contains app code fencing and fixtures for Devvit capabilities.

```
import { createDevvitTest } from "@devvit/test/server/vitest";import { reddit } from "@devvit/reddit";import { expect } from "vitest";const test = createDevvitTest();test("my first devvit test", async ({ redis }) => { await redis.set("my-key", "hello world"); const value = await redis.get("my-key"); expect(value).toBe("hello world");});
```

### Fixtures and mocks

Each test receives Devvit-specific fixtures as arguments to your test body:

```
import { realtime } from "@devvit/web/server";test("an send realtime messages", async ({ mocks, userId, subredditName }) => { await realtime.send("my-channel", { foo: "bar" }); const messages = mocks.realtime.getSentMessagesForChannel("my-channel"); expect(messages.length).toBe(1); expect(messages[0].channel).toBe("my-channel"); expect(messages[0].data?.msg).toEqual({ foo: "bar" });});
```

Mocks expose convenience helpers for inspection/resetting and the raw plugin if you need to register it on a custom config.

Note: Plugins is the internal name that we call capabilities in the docs.

Cleanup is automatic: Vitest spies are restored and Redis/mock state is cleared after every test.

### Configuration

You can customize the test environment by passing options to `createDevvitTest()`.

```
const test = createDevvitTest({ username: 'mock_user', // Default: 'testuser' userId: 't2_mock_user', // Default: 't2_testuser' subredditName: 'mock_sub', // Default: 'testsub' subredditId: 't5_mock_sub', // Default: 't5_testsub' settings: { // Pre-configured app settings 'my-setting': 'value' }, appConfig: { ... } // Custom AppConfig (defaults to minimal config)});
```

## Integration testing & isolation

The test harness is built for integration-style testing. Each test defined with `test()` runs in its own isolated world. State (including Redis and mocks) is reset for you between runs. There is no supported way to share state across tests. Vitest concurrency (`test.concurrent`) and parameterized tests (`test.each`) are fully supported.

For example, if two tests write to the same Redis key, they won't interfere with each other:

```
import { createDevvitTest } from "@devvit/test/server/vitest";import { expect } from "vitest";const test = createDevvitTest();test("should increment counter to 1", async ({ redis }) => { await redis.incrBy("counter", 1); const value = await redis.get("counter"); expect(value).toBe("1");});test("should also increment counter to 1", async ({ redis }) => { await redis.incrBy("counter", 1); const value = await redis.get("counter"); expect(value).toBe("1");});
```

### Staging data for your tests

When testing your app logic, it's best to use your own service layer methods to stage data rather than manually manipulating the mock storage. This ensures your tests cover your actual application flows and behavior more accurately.

For instance, if you're testing a `deleteUser` function, create the user first using your `createUser` function:

```
import { createDevvitTest } from "@devvit/test/server/vitest";import { expect } from "vitest";const test = createDevvitTest();test("can delete a user", async ({ redis }) => { const userManager = new UserManager(redis); // Your app class // Stage data using your API await userManager.createUser("bob", { age: 30 }); // Verify data was staged const newUser = await userManager.getUser("bob"); expect(newUser).toEqual({ age: 30 }); // Perform action await userManager.deleteUser("bob"); // Verify data was deleted const deletedUser = await userManager.getUser("bob"); expect(deletedUser).toBeNull();});
```

If you just need a quick smoke test, you can stage data directly via the same capabilities you use in production (e.g., `await redis.set('user:bob', JSON.stringify({ age: 30 }))`), but using your service APIs helps you cover more of your stack.

## Capability guides

Each mocked capability exposes the same API surface you use in production. Unless noted otherwise, every `test()` gets a completely fresh, isolated world, so state never bleeds between tests.

### Redis

```
import { createDevvitTest } from "@devvit/test/server/vitest";import { redis } from "@devvit/redis";import { expect } from "vitest";const test = createDevvitTest();test("tracks counters per test", async () => { await redis.incrBy("score", 1); const score = await redis.get("score"); expect(score).toBe("1");});
```

#### Transactions

Installation-scoped redis transactions work end-to-end in the harness. Use the
same `watch`/`multi`/`exec` flow that production code does:

```
test("commits redis transactions", async () => { await redis.set("txn", "0"); const txn = await redis.watch("txn"); await txn.multi(); await txn.incrBy("txn", 4); await txn.incrBy("txn", 1); const results = await txn.exec(); expect(results).toStrictEqual([4, 5]); expect(await redis.get("txn")).toBe("5");});
```

Global and scoped Redis data are cleared for you after every test run. Global Redis is scoped to the current test only—no manual clearing or cross-test sharing is needed. If you need to inspect mock state directly, use `mocks.redis`.

### Scheduler

Limitations

- Scheduled jobs don't actually wait for `runAt` or cron triggers. Instead, use `scheduler.listJobs()` to verify they were scheduled.

- Use the same API calls (`runJob`, `cancelJob`) you would in production.

```
import { createDevvitTest } from "@devvit/test/server/vitest";import { scheduler } from "@devvit/scheduler";import { expect } from "vitest";const test = createDevvitTest();test("schedules and cancels jobs", async () => { const jobId = await scheduler.runJob({ name: "nightly-report", runAt: new Date(Date.now() + 1_000), data: { retry: false }, }); expect(jobId).toBeDefined(); await scheduler.cancelJob(jobId); const jobs = await scheduler.listJobs(); expect(jobs).toHaveLength(0);});
```

### Settings

Limitations

- Settings are per-test. To use the same settings for all tests, configure defaults via `createDevvitTest({ settings: { ... } })`.

```
import { createDevvitTest } from "@devvit/test/server/vitest";import { settings } from "@devvit/settings";import { expect } from "vitest";const test = createDevvitTest({ settings: { "feature-flag": true, "api-key": "secret-123", },});test("reads configured settings", async () => { const isEnabled = await settings.get("feature-flag"); expect(isEnabled).toBe(true); const apiKey = await settings.get("api-key"); expect(apiKey).toBe("secret-123");});
```

You can also access `context.settings` from the fixtures if you prefer to work with the raw map.

### Realtime

Limitations

- Messages are recorded in memory; no actual WebSocket connections are opened.

- Use `mocks.realtime.getSentMessagesForChannel()` to inspect what was sent during a test.

```
import { createDevvitTest } from "@devvit/test/server/vitest";import { realtime } from "@devvit/realtime/server";import { expect } from "vitest";const test = createDevvitTest();test("emits realtime events", async ({ mocks }) => { await realtime.send("scores", { latest: 42 }); const messages = mocks.realtime.getSentMessagesForChannel("scores"); expect(messages).toHaveLength(1); expect(messages[0].channel).toBe("scores"); expect(messages[0].data?.msg).toStrictEqual({ latest: 42 });});
```

### Media

Limitations

- Uploads don't hit the network. The mock simply records the payload and returns synthetic IDs/URLs.

```
import { createDevvitTest } from "@devvit/test/server/vitest";import { media } from "@devvit/media";import { expect } from "vitest";const test = createDevvitTest();test("uploads media assets", async () => { const response = await media.upload({ url: "https://example.com/image.png", type: "image", }); expect(response.mediaId).toBe("media-1"); expect(response.mediaUrl).toBe( "https://i.redd.it/bogus-for-testing/media-1.png", );});test("inspects uploads via mocks", async ({ mocks }) => { await media.upload({ url: "https://example.com/image.png", type: "image" }); expect(mocks.media.uploads).toHaveLength(1); expect(mocks.media.uploads[0].url).toBe("https://example.com/image.png"); mocks.media.clear(); expect(mocks.media.uploads).toHaveLength(0);});
```

### Notifications

Limitations

- Notifications are recorded in memory; no actual push notifications are sent.

- Use `mocks.notifications` to inspect sent notifications and opted-in users.

```
import { createDevvitTest } from "@devvit/test/server/vitest";import { notifications } from "@devvit/notifications";import { expect } from "vitest";const test = createDevvitTest();test("sends push notifications", async ({ mocks, userId }) => { // Opt in the current user await notifications.optInCurrentUser(); const isOptedIn = await notifications.isOptedIn(userId); expect(isOptedIn).toBe(true); // Send a notification await notifications.enqueue({ title: "Hello", body: "World", recipients: [{ userId }], }); // Verify notification was sent via mocks const sent = mocks.notifications.getSentNotifications(); expect(sent).toHaveLength(1); expect(sent[0].title).toBe("Hello"); expect(sent[0].recipients[0].userId).toBe(userId);});
```

### HTTP

Limitations

- HTTP requests are blocked by default in tests to prevent accidental network calls.

- You must mock `fetch()` using Vitest's `vi.spyOn` to test code that makes HTTP requests.

By default, any `fetch()` calls in your tests will throw an error. To test code that makes HTTP requests, mock `globalThis.fetch` using Vitest's `vi.spyOn`, similar to how you mock Reddit API methods.

#### Default behavior

```
import { createDevvitTest } from "@devvit/test/server/vitest";import { expect } from "vitest";const test = createDevvitTest();test("blocks HTTP by default", async () => { await expect(fetch("https://noop.reddit.com")).rejects.toThrow( "HTTP requests are not allowed in tests", );});
```

#### Basic mocking

Use `vi.spyOn` to mock `fetch()` calls:

```
import { createDevvitTest } from "@devvit/test/server/vitest";import { expect, vi } from "vitest";const test = createDevvitTest();test("fetches Pokemon data", async () => { vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: true, status: 200, json: async () => ({ id: 25, name: "pikachu", height: 4, weight: 60, types: [{ type: { name: "electric" } }], }), } as Response); const response = await fetch("https://pokeapi.co/api/v2/pokemon/pikachu"); const data = await response.json(); expect(response.status).toBe(200); expect(data.name).toBe("pikachu"); expect(data.types[0].type.name).toBe("electric");});
```

#### Testing error cases

You can also test error handling by making your mock return error responses:

```
import { createDevvitTest } from "@devvit/test/server/vitest";import { expect, vi } from "vitest";const test = createDevvitTest();test("handles API errors", async () => { vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: false, status: 500, statusText: "Internal Server Error", text: async () => "Internal Server Error", } as Response); const response = await fetch("https://pokeapi.co/api/v2/pokemon/pikachu"); expect(response.status).toBe(500); expect(response.statusText).toBe("Internal Server Error"); const text = await response.text(); expect(text).toBe("Internal Server Error");});
```

#### Mocking POST requests

You can also mock POST requests and inspect the request body:

```
import { createDevvitTest } from "@devvit/test/server/vitest";import { expect, vi } from "vitest";const test = createDevvitTest();test("sends POST request with body", async () => { vi.spyOn(globalThis, "fetch").mockImplementation((url, options) => { const body = options?.body as string; const parsedBody = JSON.parse(body); return Promise.resolve({ ok: true, status: 201, json: async () => ({ id: 123, ...parsedBody }), } as Response); }); const response = await fetch("https://pokeapi.co/api/v2/pokemon", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "pikachu", type: "electric" }), }); const data = await response.json(); expect(response.status).toBe(201); expect(data.name).toBe("pikachu"); expect(data.type).toBe("electric");});
```

### Reddit API

Limitations

- Many core methods are mocked; unsupported methods throw helpful errors that reference this guide.

- Returned models are real instances backed by the mocks, so you can spy on or override instance methods.

The harness seeds a default user and subreddit based on your configuration. Use `mocks.reddit` to seed additional data or to inspect what the plugin saw.

ServiceSupportUsers⚠️ Partially SupportedLinksAndComments⚠️ Partially SupportedSubreddits⚠️ Partially SupportedFlair❌ Not yet supportedListings❌ Not yet supportedModeration❌ Not yet supportedModNote❌ Not yet supportedNewModmail❌ Not yet supportedPrivateMessages❌ Not yet supportedWidgets❌ Not yet supportedWiki❌ Not yet supported

Note: `LinksAndComments` is more commonly referred to as `posts`.

#### Mocking methods on returned objects

Some methods exist on the objects returned by the API (like `user.getSocialLinks()`). Since these objects are real instances returned by the harness, you can spy on the specific instance to mock them.

```
import { createDevvitTest } from "@devvit/test/server/vitest";import { reddit, type SocialLinkType } from "@devvit/reddit";import { expect, vi } from "vitest";const test = createDevvitTest();test("mocks social links on a returned user", async ({ mocks }) => { mocks.reddit.users.addUser({ id: "t2_user", name: "test_user" }); const user = await reddit.getUserByUsername("test_user"); if (!user) throw new Error("User not found"); vi.spyOn(user, "getSocialLinks").mockResolvedValue([ { id: "1", outboundUrl: "https://example.com", type: "REDDIT" as SocialLinkType, title: "Example", }, ]); await expect(user.getSocialLinks()).resolves.toStrictEqual([ { id: "1", outboundUrl: "https://example.com", type: "REDDIT", title: "Example", }, ]);});
```

#### Seeding supported models

For supported calls like `getUserByUsername`, use the provided `mocks.reddit` fixture to seed the backing store.

```
import { createDevvitTest } from "@devvit/test/server/vitest";import { expect } from "vitest";const test = createDevvitTest();test("can fetch a user", async ({ mocks }) => { mocks.reddit.users.addUser({ id: "t2_12345", name: "testuser", createdUtc: Date.now() / 1000, }); const user = await reddit.getUserByUsername("testuser"); expect(user.id).toBe("t2_12345");});
```

You can also seed Posts for `getPostById`:

```
import { reddit } from "@devvit/reddit";test("can fetch a post", async ({ mocks }) => { mocks.reddit.linksAndComments.addPost({ id: "t3_123", title: "My Test Post", subreddit: "testsub", }); const post = await reddit.getPostById("t3_123"); expect(post.title).toBe("My Test Post");});
```

## Multiple test instances

Most of the time, you'll define a single `const test = createDevvitTest()` at the top of your spec file and use fixtures/settings to customize behavior. But if you need distinct contexts, such as different subreddits or users, you can spin up additional instances, even within the same file.

```
// Development subreddit contextconst devTest = createDevvitTest({ subredditName: "my_dev_sub",});// Production subreddit contextconst prodTest = createDevvitTest({ subredditName: "my_prod_sub",});devTest("development logic", () => { /* ... */});prodTest("production logic", () => { /* ... */});
```

The reverse works too: you can create one instance and share it across every test in your application.

## How the Harness Works

To understand what makes this feel so close to production, check `createDevvitTest` in `packages/test/src/server/vitest/devvitTest.ts`. Every time you call `test()`, the helper:

- Builds an isolated context: Creates a fresh per-test context with default subreddit, user, and settings.

- Builds a mocked config: Uses `makeConfig` to install a global config, wiring up the same headers and request context that Devvit uses to run your backend.

- Wraps your test function: Ensures fixtures (`redis`, `scheduler`, `settings`, etc.) are ready and scoped to that test world before running your test.

Each capability client you call is actually a proxy to a privileged plugin, which is the part of the platform that talks to Redis, Scheduler, Reddit, etc. The harness swaps those plugins for stateful mocks (exposed on `mocks.<capability>.plugin`), keeping commands in memory and isolated per test. This lets you exercise privileged operations, such as storing data or sending realtime events, without touching real infrastructure. Concurrency and parameterized tests are supported because the wrapper re-applies fixtures on every test call.

Since the harness injects the same context headers as live requests, you can use capability clients exactly as you would in production, all while keeping your tests fast and isolated.


<!-- ============ /docs/guides/tools/ui_simulator ============ -->

> source: https://developers.reddit.com/docs/guides/tools/ui_simulator

- 
- Development Tools
- UI Simulator

# UI Simulator

## Overview

Most Reddit users will see your app on a mobile device, so it’s important to know how your app will look and feel in that environment. UI simulator is a specialized viewing mode that gives you tools to help you build, view, and test your app for a mobile audience.

## Features

- Mobile viewport simulation: Displays your app in a mobile-sized container (matching common mobile device dimensions)

- Size controls: Toggle between mobile, desktop, and fullscreen views to test responsive behavior

- Dark/light mode toggle: Test your app's appearance in both light and dark themes

## Who can access UI simulator?

UI simulator mode is automatically enabled when you are the app developer and viewing the app in a subreddit where you are a moderator. You'll see it in the header of your webview app modal:

## Using UI simulator

- When viewport simulator is enabled, your app will initially load in mobile view

- Use the viewport controls to switch between different view sizes:

- Mobile (default): Shows your app in a mobile-sized container

- Desktop: Expands to a wider viewport

- Fullscreen: Takes up the entire screen

- Use the dark/light mode toggle to test both color schemes

## Mobile-first development principles

Always test your app in mobile view first to validate that all critical features are accessible on small screens.

### Why mobile-first?

- Most Reddit users access content through mobile devices

- Mobile constraints help create more focused, efficient designs

- Better performance due to progressive enhancement

## Best practices

- 
Start small, scale up

- Begin with the mobile layout, adding complexity as the viewport size increases

- Use progressive enhancement rather than graceful degradation

- 
Content prioritization

- Focus on essential content and features first

- Optimize images and media for smaller screens

- Stack content vertically for mobile

- Consider thumb zones and reachability: keep important actions within easy reach

- 
Accessibility

- Ensure main touch targets are easily tappable & there is sufficient spacing between interactive elements

- Maintain proper color contrast ratios in both themes

- Use relative units (rem, em, %) over fixed pixels

- Ensure text is readable without zooming

- 
Regular testing

- Test all new features in mobile view before desktop

- Verify both dark and light mode appearances

Remember: Mobile users are your primary audience. If it works well on mobile, it will likely work well everywhere else.

Example of how to use a CSS media query to set different colors for light and dark mode:

```
/* Light mode (default) */:root { --bg-color: #ffffff; --text-color: #000000;}/* Dark mode */@media (prefers-color-scheme: dark) { :root { --bg-color: #000000; --text-color: #ffffff; }}
```


<!-- ============ /docs/guides/tools/vite ============ -->

> source: https://developers.reddit.com/docs/guides/tools/vite

- 
- Development Tools
- Vite Plugin

# Build with the Devvit Vite plugin

The Devvit Vite plugin is an opinionated (and 100% optional) plugin for Devvit Web that unifies your client and server builds into a single command using Vite's Environment API.

Features:

- Unified build command for client and server

- Automatic entrypoint bundling based on your `devvit.json` configuration

- Optimized configuration for building your code for Devvit

The plugin is completely optional. You can use Vite without it, or swap in Webpack, esbuild, or any other bundler you prefer.

You can see a full template using it here: https://github.com/reddit/devvit-template-vibe-coding/blob/main/vite.config.ts

## Quick start

Add the plugin to your `vite.config.ts` alongside any UI tooling you already use:

```
import { defineConfig } from "vite";import react from "@vitejs/plugin-react";import tailwind from "@tailwindcss/vite";import { devvit } from "@devvit/start/vite";export default defineConfig({ plugins: [ react(), tailwind(), // Make sure to add the Devvit plugin last! devvit(), ],});
```

## What the plugin expects

The plugin uses your `devvit.json` as the source of truth for client entry points. Make sure you have at least one entrypoint defined:

```
{ "post": { "dir": "dist/client", "entrypoints": { "default": { "inline": true, "entry": "splash.html" } } }, "server": { "dir": "dist/server", "entry": "index.ts" }}
```

The plugin reads `devvit.json` from the project root (the current working directory unless you set `root` in `vite.config.ts`). If it can’t find a valid config, the build fails.

Why your client output can look nestedBy default, the Devvit Vite plugin sets the Vite root to `src/client` when that folder exists (unless you explicitly set `root` in `vite.config.ts`). That keeps client output flat, like `dist/client/index.html`.If you explicitly set `root` to the repo root or include `src/` in `post.entrypoints.*.entry`, Vite will preserve that path in the output, leading to nested paths like `dist/client/src/client/index.html`. Keep entry paths relative to the client root (no `src/` prefix) to preserve the flat layout.Server builds use a fixed entry point and are not affected by this behavior.

For the server build, the plugin looks for one of these files:

- `src/server/index.ts`

- `src/api/index.ts`

- `src/index.ts`

If neither file exists, the build fails with a clear error message.

## What it builds

Out of the box, the plugin configures two environments depending on what's defined in your `devvit.json`:

- Client build outputs to `dist/client` and uses the entry points from `devvit.json`.

- Server build outputs to `dist/server` as `index.cjs`

Note that Devvit requires a single CJS bundle to run the server code. Please do not mark server dependencies as `external` as it will break your server build. This may change in the future!

The plugin currently always writes to `dist/client` and `dist/server`, regardless of `post.dir` or `server.dir` in `devvit.json`. Those values are used by Devvit, but Vite’s output paths are fixed in the plugin.

## Customize the build

The plugin accepts a small options object that lets you tweak both environments without redoing the whole config. Each option is merged into the generated Vite environment config.

```
type DevvitPluginOptions = { client?: EnvironmentOptions; server?: EnvironmentOptions; logLevel?: "info" | "warn" | "error" | "silent"; verbose?: boolean;};
```

For example, if you want to disable sourcemaps for the client build:

```
import { defineConfig } from "vite";import { devvit } from "@devvit/start/vite";export default defineConfig({ plugins: [ devvit({ client: { build: { sourcemap: false, }, }, }), ],});
```

Any customization you make is automatically merged into the generated environment config so don't worry about spreading our defaults across your config changes.

## Sharing code between client and server

If you need to share code between client and server, keep it outside of `src/server` and `src/api`. Treat those folders as server-only. Put shared modules in a neutral folder (for example `src/shared`) and import them from both environments.

```
src/ server/ index.ts # server entry client/ main.tsx # client entry shared/ formatScore.ts # safe to import from client + server
```

## Migrating old templates

If you started with a template before this plugin, migrating it is simple!

- Run the installation command

```
npm install @devvit/start
```

- Add a `vite.config` to the root of your project. For example, this is how you would migrate a React app:

vite.config.ts

```
import { defineConfig } from "vite";import react from "@vitejs/plugin-react";import tailwind from "@tailwindcss/vite";import { devvit } from "@devvit/start/vite";export default defineConfig({ plugins: [react(), tailwind(), devvit()],});
```

Note: You might see TypeScript errors when using this config because it's not included in any of the tsconfigs you have. You will need to include the file in a tsconfig file for this to be fixed. You can also rename it to `vite.config.js` if you don't want to use TypeScript.

- Remove `src/client/vite.config.ts` and `src/server/vite.config.ts`

Technically, that's all you need to do! However, you can also make your development experience a lot nicer by utilizing the new `scripts` field in your `devvit.json` file.

- Add the following to your `devvit.json` file:

devvit.json

```
{ "scripts": { "dev": "vite build --watch", "build": "vite build" }}
```

- Update your `package.json` commands to look like the following:

package.json

```
diff --git a/package.json b/package.json--- a/package.json+++ b/package.json@@ -7,14 +7,6 @@ "scripts": {- "build:client": "cd src/client && vite build",- "build:server": "cd src/server && vite build",- "build": "npm run build:client && npm run build:server",- "dev": "concurrently -k -p \"[{name}]\" -n \"CLIENT,SERVER,DEVVIT\" -c \"blue,green,magenta\" \"npm run dev:client\" \"npm run dev:server\" \"npm run dev:devvit\"",- "dev:client": "cd src/client && vite build --watch",- "dev:devvit": "devvit playtest",- "dev:server": "cd src/server && vite build --watch",- "dev:vite": "cd src/client && vite --port 7474",+ "build": "vite build",+ "dev": "devvit playtest",
```

You can also remove the `concurrently` dependency after this switch.

- Run `npm run dev` to make sure everything is working.

## Limitations and gotchas

- Build-only: The plugin only supports `vite build`. There is no support for `vite dev` or Hot Module Replacement (HMR) at this time. This is because `devvit playtest` works by uploading your build to our servers and running it on Reddit.com. Instead, use `vite build --watch` as your dev command.

- Public dir resolution: The plugin auto-detects a `public/` folder at the repo root or inside `src/client`. If both exist, the build fails—keep a single public directory.

- If you run into this error while using `tailwindcss`: `[@tailwindcss/vite:generate:build] Cannot create proxy with a non-object as target or handler`. All you need to do is bump `@tailwindcss/vite` and `tailwindcss` to `4.1.18` in your `package.json` and `npm install`


<!-- ============ /docs/guides/tools/multiple_developers ============ -->

> source: https://developers.reddit.com/docs/guides/tools/multiple_developers

- 
- Development Tools
- Multiple Developers

# Multiple Developers
Multiple developers working on a single app can clash with each other's uploads during playtesting. This is due to the same playtest subreddit and app name being used.

Local environment variables allow multiple developers to share a single codebase while each having separate playtest subreddits and app names.

## Setup

- Keep `devvit.json` in git

- Use local environment variables per developer to override the local targets used by the Devvit CLI:

- `DEVVIT_SUBREDDIT` (where you playtest)

- `DEVVIT_APP_NAME` (the app name the CLI uses)

- Alternatively, use a local `.env` file and ensure it's not committed by adding it to `.gitignore`

This gives each developer an isolated development lane without forking the repository or repeatedly editing `devvit.json`.

warning
Local environment variables and `.env` files are read during playtesting only. For API keys and other sensitive values, use Settings and Secrets.

## Why not remove devvit.json from git?

`devvit.json` is part of the app's core configuration, including capabilities, entry points, and permissions. If it isn't versioned, teammates can drift out-of-sync due to mismatched configurations. Instead, keep `devvit.json` stable and use local environment overrides.


================================================================================
# Guides — migration
================================================================================



<!-- ============ /docs/guides/migrate/devvit-web-experimental ============ -->

> source: https://developers.reddit.com/docs/guides/migrate/devvit-web-experimental

- 
- Migration Guides
- Migrating from Devvit Web Experimental to Devvit Web

# Migrating from Devvit Web Experimental to Devvit Web

This guide will help you migrate from the experimental version of Devvit Web to the official Devvit Web setup. You must complete this migration to publish and grow your app.

Note: Apps can be partially migrated, you don't need to re-write everything!

## How to identify if you're using the experimental version

You're using Devvit Web experimental if:

- Your project is based on either of these templates:

- https://github.com/reddit/devvit-bolt-starter-experimental

- https://github.com/reddit/devvit-template-react

- You have a `defineConfig` function in `src/devvit/main.tsx`

## What's changing

### Before (experimental)

- Uses `defineConfig` function in blocks

- Multiple `@devvit/X` packages for different capabilities

- Webroot-based dist outputs

### After (final version)

- Uses `devvit.json` for all configuration

- Single `@devvit/web` package with submodule imports

- Cleaner dist folder structure

- Clear separation of client and server code

## Migration steps

### 1. Install the latest @devvit/web

```
npm install @devvit/web@latest
```

### 2. Remove individual @devvit packages

Remove all individual capability packages:

```
npm uninstall @devvit/redis @devvit/server @devvit/client
```

### 3. Create your devvit.json

Create a `devvit.json` file in your project root. This replaces all configuration previously done through `defineConfig`:

```
{ "post": { "client": { "dir": "dist/client", "entry": "dist/client/index.html" } }, "blocks": { "entry": "src/devvit/main.tsx" }, "server": { "entry": "dist/server/index.cjs" }}
```

Note: Output directories no longer need to go to `webroot`. Use `dist/client` and `dist/server` for cleaner organization.

### 4. Update your imports

Change all imports from individual packages to the unified `@devvit/web` package:

#### Server-side imports

```
// Beforeimport { redis } from '@devvit/redis';import { createServer, context } from '@devvit/server';// Afterimport { redis } from '@devvit/web/server';import { createServer, context } from '@devvit/web/server';
```

#### Client-side imports

```
// Beforeimport { navigateTo } from '@devvit/client';// Afterimport { navigateTo } from '@devvit/web/client';
```

### 5. Remove defineConfig from main.tsx

In your `src/devvit/main.tsx`, remove the `defineConfig` function and any configuration it contained. This configuration now lives in `devvit.json`.

```
// Before in src/devvit/main.tsximport { defineConfig } from '@devvit/server';export default defineConfig({ // ... configuration});// After// Simply export your Devvit instance or any Devvit.addX functionsimport { Devvit } from '@devvit/web';// Your Devvit setup code hereexport default Devvit;
```

### 6. Reorganize your project structure

We recommend using a clean folder structure:

```
your-app/├── src/│ ├── client/ # Your web app (React, etc.)│ │ └── index.tsx│ ├── server/ # Your server endpoints│ │ └── index.ts│ └── devvit/ # Blocks-related code (optional now)│ └── main.tsx├── dist/ # Built assets│ ├── client/│ └── server/├── devvit.json└── package.json
```

### 7. Update your build configuration

Ensure your bundler outputs to the correct directories specified in `devvit.json`:

#### Server Vite config example

```
export default defineConfig({ ssr: { noExternal: true, }, build: { emptyOutDir: false, ssr: 'index.ts', outDir: '../../dist/server', target: 'node22', sourcemap: true, rollupOptions: { external: [...builtinModules], output: { format: 'cjs', entryFileNames: 'index.cjs', inlineDynamicImports: true, }, }, },});
```

#### Client Vite config example

```
export default defineConfig({ build: { outDir: '../../dist/client', // No longer webroot },});
```

## Quick migration path

For the fastest migration:

- Start with a new template: Clone https://github.com/reddit/devvit-template-react

- Move your server endpoints: Copy your server code to the `src/server` folder

- Move your client app: Copy your React/web code to the `src/client` folder

- Update imports: Find and replace all `@devvit/X` imports with `@devvit/web/server` or `@devvit/web/client`

- Configure devvit.json: Set up your entrypoints as shown above and update your app name

- Test locally: Run `npm run dev` to ensure everything works

## Additional considerations

- All capabilities previously available through the experimental API are still available in the final version

- The context object and Redis access work the same way, just with different import paths

- Your app logic can still be split between client and server as before


<!-- ============ /docs/guides/migrate/devvit-singleton ============ -->

> source: https://developers.reddit.com/docs/guides/migrate/devvit-singleton

- 
- Migration Guides
- Migrating Blocks/Mod Tools to Devvit Web

# Migrating Blocks/Mod Tools to Devvit Web

This guide covers migrating traditional Devvit apps (using only Blocks or Mod Tools, without web views) to the Devvit Web setup. This is a straightforward migration that requires minimal changes.

## Overview

The migration primarily involves switching from `devvit.yaml` to `devvit.json` configuration. Your existing Blocks and Mod Tools code will continue to work with minimal changes.

## Migration steps

### 1. Create devvit.json

Create a `devvit.json` file in your project root with your app configuration:

```
{ "name": "your-app-name", "blocks": { "entry": "src/main.tsx", "triggers": ["onPostCreate"] }}
```

Replace:

- `"your-app-name"` with your actual app name

- `"src/main.tsx"` with the path to your main Blocks entry point (where you export your Devvit instance)

- Include any triggers used in your src/main.tsx in the triggers array (or remove the parameter)

### 2. Remove devvit.yaml

Delete the `devvit.yaml` file from your project root. All configuration is now handled by `devvit.json`.

### 3. Handle static assets

If your app uses static assets (images, fonts, etc.) from an `assets` folder, you'll need to define this in update your `devvit.json` to point to these assets:

```
{ "name": "your-app-name", "blocks": { "entry": "src/main.tsx", "triggers": ["onPostCreate"] }, "media": { "dir": "assets/" }}
```

### 4. Test your app

Run your app locally to ensure everything works:

```
devvit playtest
```

## That's it!

Your Blocks and Mod Tools code should work as intended without any other changes. The Devvit runtime handles the compatibility layer automatically.

While your app will work with just these changes, we recommend exploring the additional capabilities available in Devvit Web over time.


<!-- ============ /docs/guides/migrate/inline-web-view ============ -->

> source: https://developers.reddit.com/docs/guides/migrate/inline-web-view

- 
- Migration Guides
- Migrating from useWebView to Devvit Web

# Migrating from useWebView to Devvit Web

This guide will migrate your legacy webview implementation (using useWebView inside of Blocks) to the official Devvit Web setup.

note
Apps can be partially migrated, you don't need to re-write everything!

# Before

- Use postMessage for message passing

- App logic is isomorphic (server/client) in Blocks

- No client effects available

# After

- No postMessage required

- Use web native fetch() to server endpoints directly

- App logic is either on the client, or the server, with clear deliniation

- Client effects are available directly from web views

## Setting up devvit.json

The first thing you need to do is setup `devvit.json`.

Schema here: https://developers.reddit.com/schema/config-file.v1.json

`devvit.json` supports all capabilities previously available in the `Devvit` singleton, e.g. `Devvit.addCustomPostType()`. For the purposes of this guide, only the post rendering logic will be migrated.

### Understanding entrypoints

Your `devvit.json` must have entrypoints that point to outputs of your code. It is assumed that you have installed a bundler or can otherwise prepare static assets to appear in your dist folders.

```
{ "post": { "client": { // The output of your client app, probably /src/webroot "dir": "dist/client", "entry": "dist/client/index.html" } }, "blocks": { // point to where you export Devvit singleton, probably src/main.tsx "entry": "src/devvit/main.tsx" }, "server": { // new folder which will contain your Node server "entry": "dist/server/index.cjs" },}
```

You'll notice that the `blocks` entrypoint points to your TypeScript source file (`src/devvit/main.tsx`). This is because the Devvit CLI handles bundling for Blocks automatically. For your `client` and `server` entrypoints, however, you are responsible for bundling your code and pointing to the final output files in your `dist` directory.

### Building your client and server

The `devvit.json` configuration for `client` and `server` points to files in a `dist` directory. This means you're responsible for building your web and server assets. You can use any bundler you like, such as `vite`.

For example, your `package.json` might include scripts to output your assets to the `dist` folder.

Sample server vite config

```
import { defineConfig } from 'vite';import { builtinModules } from 'node:module';export default defineConfig({ ssr: { noExternal: true, }, build: { ssr: 'index.ts', outDir: '../../dist/server', target: 'node22', sourcemap: true, rollupOptions: { external: [...builtinModules], output: { format: 'cjs', entryFileNames: 'index.cjs', inlineDynamicImports: true, }, }, },});
```

Sample client Vite config (for React)

```
import { defineConfig } from 'vite';import tailwind from '@tailwindcss/vite';import react from '@vitejs/plugin-react';// https://vitejs.dev/config/export default defineConfig({ plugins: [react(), tailwind()], build: { outDir: '../../dist/client', sourcemap: true, chunkSizeWarningLimit: 1500, },});
```

## Setting up your server endpoints

You can use any Node server for your server endpoints. This guide will use Express.

- Install Express

```
npm i express
```

- Create a server index file

src/server/index.ts

```
import express from 'express';// The `@devvit/server` package provides the tools to create a server,// and gives you access to the request context.import { createServer, context, getServerPort, redis } from '@devvit/web/server';const app = express();// Middleware for JSON body parsingapp.use(express.json());// Middleware for URL-encoded body parsingapp.use(express.urlencoded({ extended: true }));// Middleware for plain text body parsingapp.use(express.text());const router = express.Router();// The `context` object is automatically populated with useful information,// like the current user's ID. Devvit's services, like redis, are also// available via named imports from `@devvit/server`.router.get( '/api/hello', async (_req, res): Promise => { const { userId } = context; res.status(200).json({ message: `Hello ${userId}`, }); });router.get('/api/init', async (_req, res): Promise => { res.json({ initialState: await redis.get('initialState') });});// Use router middlewareapp.use(router);// Get port from environment variable with fallbackconst port = getServerPort();const server = createServer(app);server.on('error', (err) => console.error(`server error; ${err.stack}`));server.listen(port, () => console.log(`http://localhost:${port}`));
```

### Calling your server endpoints

Now

Instead of using `postMessage`, your client-side code can now directly fetch the initial state from the `/api/init` endpoint we defined in the server.

```
const res = await fetch('/api/init');const data = await res.json();console.log(data.initialState); // Logs the state from Redis
```

## Client effects

Previously, client effects were not available to your webview app. You had to pass a custom postMessage and handle that message in Blocks. Now, all client effects are available directly in the web-view through `@devvit/client`.

Before

```
const BlocksComponent = () => { const wv = useWebView({ onMessage: (message) => { if (message.type === 'navigate_to') { ui.navigateTo(message.data.destination); } }, });};
```

```
window.postMessage({ type: 'navigate_to', destination: 'reddit.com' });
```

Now

```
import { navigateTo } from '@devvit/web/client';navigateTo('reddit.com');
```


<!-- ============ /docs/guides/migrate/public-api ============ -->

> source: https://developers.reddit.com/docs/guides/migrate/public-api

- 
- Migration Guides
- Migrating your PRAW App to Devvit Web

# Migrating your PRAW App to Devvit Web

If you have built Reddit bots or moderation tools using PRAW (Python Reddit API Wrapper) and the standard Reddit API, you can port them directly into Reddit using Devvit Web. Devvit Web represents Reddit's modern client/server architecture for applications, allowing you to build rich moderation tools and automated bots utilizing familiar web frameworks (like Hono and Vite).
This guide shows you how to transition your Python/PRAW app to a Devvit Web app, utilizing concepts and logic structures you are already familiar with.

## 1. Creating a Devvit App

Unlike standard Python scripts, a Devvit Web application is structurally split into a front-end client and a back-end server, tied together by a configuration file. To jumpstart your migration, you can utilize official Reddit templates.

### Using the Mod Tool Template

A highly recommended starting point for migrating PRAW moderation tools is the Mod Tool Template. Simply navigate to developers.reddit.com/new, select the Mod Tool Template and follow the instructions. The project created for you provides a complete foundation with a lightweight web framework (Hono) for backend logic, Vite for web components, and TypeScript for type safety.

### The Architecture

A typical Devvit Web template will generate the following file structure:

- devvit.json: This is your app's configuration file (replacing the old devvit.yaml paradigm). It defines your app's name, permissions, triggers, and scheduled jobs.

- src/client/: This directory holds your webview code (HTML/CSS/JS or React components built with Vite). For Mod Tools it's common to not use the client folder

- src/server/: This directory contains your backend API logic. Here, a Node server framework (like Hono) processes requests, interacts with the Reddit API, and handles triggers. All server endpoints typically start with /internal/ or /api/.

## 2. Python to TypeScript: Server Concepts

In PRAW, you managed state in a continuous Python loop. In Devvit Web, your application acts as an API server responding to specific incoming webhook requests (handled seamlessly by Hono). Here are the key analogies:

- dict vs. Object/Record: Python dictionaries serve the same structural purpose as TypeScript objects.

- pip install vs. npm install: Instead of managing a requirements.txt file, Devvit uses a package.json file to track dependencies.

- Continuous Polling vs. Webhooks: Instead of polling Reddit in a while True: loop, Devvit automatically sends a POST request to your Hono server whenever an event occurs.

## 3. Triggers (Replacing Continuous Polling)

In Devvit Web, you configure Triggers in your devvit.json. When an event happens (like a new comment), Devvit sends a payload to the designated endpoint on your server.
Step 1: Configuration (devvit.json)

```
{ "name": "my-moderator-bot", "triggers": { "onCommentSubmit": "/internal/triggers/on-comment-submit" }}
```

Step 2: Server Logic (src/server/index.ts)

```
// Hono is a small web framework used to define HTTP routes.import { Hono } from 'hono';// TriggerResponse is the expected JSON response shape for trigger endpoints.import type { TriggerResponse } from '@devvit/web/shared';// Create a web server app instance.const app = new Hono();// Listen for the onCommentSubmit trigger endpoint configured in devvit.json.app.post('/internal/triggers/on-comment-submit', async (c) => { // Parse the incoming JSON body from Devvit. // The part is a TypeScript type hint for what fields we expect. const input = await c.req.json(); // Pick a display name safely: // - ?. means "if this exists, read it" // - ?? means "if left side is null/undefined, use right side" const authorName = input.author?.username ?? input.author?.name ?? 'unknown user'; console.log(`New comment created by ${authorName}!`); // Return a standard "ok" response with HTTP 200 status. return c.json({ status: 'ok' }, 200);});export default app;
```

## 4. Adding and Removing Comments

To moderate content in Devvit Web, you use the Reddit API client accessible within your server logic. This behaves similarly to comment.mod.remove() in PRAW but relies on asynchronous function calls.

```
// Hono handles incoming HTTP requests from Devvit.import { Hono } from 'hono';// reddit is the Devvit Reddit API client for moderation/content actions.import { reddit } from '@devvit/web/server';// TriggerResponse is the response type expected by trigger handlers.import type { TriggerResponse } from '@devvit/web/shared';const app = new Hono();app.post('/internal/triggers/on-comment-submit', async (c) => { // Parse request JSON and describe expected fields with a TypeScript type. const input = await c.req.json(); // Get the comment ID if it exists. const commentId = input.comment?.id; // If we cannot find the comment ID, we cannot moderate the comment. if (!commentId) return c.json({ status: 'ignored' }, 200); // Normalize text to lowercase so our keyword check is case-insensitive. const body = input.comment?.body?.toLowerCase() ?? ''; // Check if the comment matches a specific moderation rule if (body.includes('rule-breaking string')) { // 1. Remove the comment natively await reddit.remove(commentId, true); // true = flag as spam // 2. Reply to the removed comment with a removal reason await reddit.submitComment({ // Reply to the removed comment itself. id: commentId, text: 'Your comment was removed automatically for violating our community guidelines.', // Run as the app account rather than a user account. runAs: 'APP', }); } return c.json({ status: 'ok' }, 200);});export default app;
```

## 5. Using Redis for Storage (Replacing SQLite/JSON)

Instead of maintaining a local SQLite database for tracking user warnings or config states, Devvit Web gives you direct access to a managed Redis instance.

```
// Hono handles HTTP routes.import { Hono } from 'hono';// Redis client for key-value storage.import { redis } from '@devvit/redis';// Standard trigger response type.import type { TriggerResponse } from '@devvit/web/shared';const app = new Hono();app.post('/internal/triggers/on-post-submit', async (c) => { // Read trigger payload JSON. const input = await c.req.json(); // Extract the submitting user's ID. const authorId = input.author?.id; // If author is missing, skip this event safely. if (!authorId) return c.json({ status: 'ignored' }, 200); // Build a per-user counter key, for example: post_count:t2_abc123 const redisKey = `post_count:${authorId}`; // Increment the count in Redis const newCount = await redis.incrBy(redisKey, 1); console.log(`User ${authorId} has submitted ${newCount} posts.`); return c.json({ status: 'ok' }, 200);});export default app;
```

## 6. Using Schedulers (Replacing cron jobs or time.sleep)

PRAW bots frequently rely on time.sleep() for delayed tasks. In Devvit Web, you define Scheduled Tasks in devvit.json and map them to internal Hono endpoints. You can schedule recurring jobs (like cron) or one-off tasks.
Step 1: Configuration (devvit.json)

```
{ "scheduler": { "tasks": { "remind-user-job": { "endpoint": "/internal/scheduler/remind-user-job" } } }}
```

Step 2: Scheduling and Handling (src/server/index.ts)

```
// Hono handles incoming webhook/scheduler HTTP requests.import { Hono } from 'hono';// scheduler queues delayed jobs, reddit sends private messages.import { scheduler, reddit } from '@devvit/web/server';// Types for scheduler request/response payloads.import type { TaskRequest, TaskResponse } from '@devvit/web/server';// Type for standard trigger responses.import type { TriggerResponse } from '@devvit/web/shared';const app = new Hono();// 1. Triggering the scheduled job (e.g., from a comment trigger)app.post('/internal/triggers/on-comment-submit', async (c) => { // Parse incoming trigger JSON. // This generic type describes what data shape we expect from the payload. const input = await c.req.json(); // Normalize body text so command checks are case-insensitive. const body = input.comment?.body?.toLowerCase() ?? ''; if (body.includes('!remindme')) { // Use username when available, otherwise fall back to name. const username = input.author?.username ?? input.author?.name; // If we still do not have a recipient, skip this event. if (!username) return c.json({ status: 'ignored' }, 200); // Create a timestamp one hour in the future. const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000); // Enqueue the job await scheduler.runJob({ // A unique job ID (useful for debugging/canceling). id: `remind-user-${username}-${Date.now()}`, // Must match a task name declared in devvit.json. name: 'remind-user-job', // Custom payload delivered later to the scheduler endpoint. data: { username, message: 'Your 1-hour reminder!' }, // Time when this job should run. runAt: oneHourFromNow, }); } return c.json({ status: 'ok' }, 200);});// 2. The endpoint that executes when the timer concludesapp.post('/internal/scheduler/remind-user-job', async (c) => { // Parse scheduler payload JSON. // TaskRequest means "TaskRequest whose data looks like this object". const req = await c.req.json>(); // Read values from req.data safely; default to empty object if data is missing. const { username, message } = req.data ?? {}; // Guard clause: ensure required fields exist before continuing. if (!username || !message) return c.json({ status: 'ignored' }, 200); // Send a Reddit private message to the user. await reddit.sendPrivateMessage({ to: username, subject: 'Automated Reminder', text: message, }); return c.json({ status: 'ok' }, 200);});export default app;
```

## Summary of Concepts

ConceptPRAW (Python)Devvit Web (Hono + TypeScript)ArchitectureContinuous Running ScriptClient/Server API driven by devvit.jsonListening for Eventssubreddit.stream.comments()Webhooks handled via app.post('/internal/...', ...)Database StorageSQLite, JSON, external DBsimport { redis } from '@devvit/redis'Delayed Actionstime.sleep()scheduler.runJob() + Server Endpoint

### ---

References

- Mod Tools Template - GitHub

- Redis

- Scheduler

- Triggers


================================================================================
# Earn money — payments
================================================================================



<!-- ============ /docs/earn-money/payments/payments_overview ============ -->

> source: https://developers.reddit.com/docs/earn-money/payments/payments_overview

- 
- In-App Purchases
- In-App Purchases Overview

# In-App Purchases Overview

Add products to your app and get paid for what you sell. The payments plugin lets you prompt users to buy premium features that you build into your app, like in-game items, additional lives, or exclusive features into your app.

## How to get paid

You’ll set the price of the products in your app in Reddit gold. Users will use gold to acquire the items, and an equivalent amount of gold will accumulate in your app account.

Information about payouts is located here.

## Prerequisites

You can use the sandbox to build and test payments, but before you can publish your app and sell products, you’ll need to:

- Verify you meet the eligibility criteria.

- Complete the verification process. You can start the process and check the status of your verification via your settings page.

- Accept and comply with our Earn Terms and Earn Policy.

All products will be reviewed by the Developer Platform team to ensure compliance with our content policy. Products are approved during the app review process after you publish your app.


<!-- ============ /docs/earn-money/payments/payments_add ============ -->

> source: https://developers.reddit.com/docs/earn-money/payments/payments_add

- 
- In-App Purchases
- Add payments

# Add payments

The Devvit payments API is available in Devvit Web. Keep reading to learn how to configure your products and accept payments.

To start with a template, select the payments template when you create a new project or run:

```
devvit new
```

To add payments functionality to an existing app, run:

```
npm install @devvit/payments
```

note
Make sure you’re on Devvit 0.11.3 or higher. See the quickstart to get up and running.

## Implement Devvit Web payments

### Configure devvit.json

You can reference an external `products.json` file, or define products directly. Endpoints are required for fulfillment and optional for refunds.

devvit.json

```
{ "payments": { "productsFile": "./products.json", // optionally define products here: "products": [...] instead "endpoints": { "fulfillOrder": "/internal/payments/fulfill", "refundOrder": "/internal/payments/refund" } }}
```

### Server: fulfill (and optional refund)

Create endpoints to fulfill and optionally revoke purchases.

- Hono
- Express
server/index.ts

```
import type { PaymentHandlerResponse, Order } from "@devvit/web/server";app.post("/internal/payments/fulfill", async (c) => { const order = await c.req.json(); // Fulfill the order (grant entitlements, record delivery, etc.) return c.json({ success: true });});app.post("/internal/payments/refund", async (c) => { const order = await c.req.json(); // Optionally revoke entitlements for a refunded order return c.json({ success: true });});
```

server/index.ts

```
import type { PaymentHandlerResponse, Order } from "@devvit/web/server";router.post( "/internal/payments/fulfill", async (req, res) => { const order = req.body; // Fulfill the order (grant entitlements, record delivery, etc.) res.json({ success: true }); },);router.post( "/internal/payments/refund", async (req, res) => { const order = req.body; // Optionally revoke entitlements for a refunded order res.json({ success: true }); },);export default router;
```

### Server: Fetch products

On the server, use `payments.getProducts()` and `payments.getOrders()`. If the client needs product metadata, expose it via your own `/api/` endpoint.

- Hono
- Express
server/index.ts

```
// Example: expose products for client displayimport type { Product } from "@devvit/web/shared";import { payments } from "@devvit/web/server";app.get("/api/products", async (c) => { const products = await payments.getProducts(); return c.json(products);});
```

server/index.ts

```
// Example: expose products for client displayimport type { Product } from "@devvit/web/shared";import { payments } from "@devvit/web/server";app.get("/api/products", async (_req, res) => { const products = await payments.getProducts(); res.json(products);});
```

### Client: trigger checkout

Use `purchase()` from `@devvit/web/client` with a product SKU (or array of SKUs).

client/index.ts

```
import { purchase, OrderResultStatus } from "@devvit/web/client";export async function buy(sku: string) { const result = await purchase(sku); if (result.status === OrderResultStatus.STATUS_SUCCESS) { // show success } else { // show error or retry (result.errorMessage may be set) }}
```

## Register products

Register products in the src/products.json file in your local app. To add products to your app, run the following command:

```
devvit products add
```

Registered products are updated every time an app is uploaded, including when you use Devvit playtest.

Click here for instructions on how to add products manually to your products.json file.The JSON schema for the file format is available at products.json schema.Each product in the products field has the following attributes:AttributeDescription`sku`A product identifier that can be used to group orders or organize your products. Each sku must be unique for each product in your app.`displayName`The official name of the product that is displayed in purchase confirmation screens. The name must be fewer than 50 characters, including spaces.`description`A text string that describes the product and is displayed in purchase confirmation screens. The description must be fewer than 150 characters, including spaces.`price`An predefined integer that sets the product price in Reddit Gold. See details below.`image.icon`(optional) The path to the icon that represents your product in your assets folder.`metadata`(optional) An optional object that contains additional attributes you want to use to group and filter products. Keys and values must be alphanumeric (a - Z, 0 - 9, and - ) and contain 30 characters or less. You can add up to 10 metadata keys. Metadata keys cannot start with "devvit-".`accountingType`Categories for how buyers consume your products. Possible values are: 
- `INSTANT` for purchased items that are used immediately and disappear.
- `DURABLE` for purchased items that are permanently applied to the account and can be used any number of times
- `CONSUMABLE` for items that can be used at a later date but are removed once they are used.
- `VALID_FOR_` values indicate a product can be used throughout a period of time after it is purchased.

## Price products

Product prices are predefined and must be one of the following gold values:

- 5 gold ($0.10)

- 25 gold ($0.50)

- 50 gold ($1)

- 100 gold ($2)

- 150 gold ($3)

- 250 gold ($5)

- 500 gold ($10)

- 1000 gold ($20)

- 2500 gold ($50)

note
Actual payments will not be processed until your products are approved. While your app is under development, you can use sandbox payments to simulate purchases.

## Design guidelines

You’ll need to clearly identify paid products or services. Here are some best practices to follow:

- Use a short name, description, and image for each product.

- Don’t overwhelm users with too many items.

- Try to keep purchases in a consistent location or use a consistent visual pattern.

- Only use the gold icon to indicate purchases for Reddit Gold.

### Product image

Product images need to meet the following requirements:

- Minimum size: 256x256

- Supported file type: .png

If you don’t provide an image, the default Reddit product image is used.

Example

```
{ "$schema": "https://developers.reddit.com/schema/products.json", "products": [ { "sku": "god_mode", "displayName": "God mode", "description": "God mode gives you superpowers (in theory)", "price": 25, "images": { "icon": "products/extra_life_icon.png" }, "metadata": { "category": "powerup" }, "accountingType": "CONSUMABLE" } ]}
```

### Purchase buttons (required)

Use your own UI (e.g. a button or product card) and call `purchase(sku)` from `@devvit/web/client` when the user chooses a product. Follow the design guidelines (e.g. gold icon, clear labeling).

#### Webviews

Use Reddit’s primary, secondary, or bordered button component and gold icon in one of the following formats:

Use a consistent and clear product component to display paid goods or services to your users. Product components can be customized to fit your app, like the examples below.

## Complete the payment flow

Your fulfill endpoint (configured in `devvit.json` and implemented in the server) is called during the order flow. It customizes how your app fulfills product orders and lets you reject an order.

Return `{ success: true }` to accept the order, or `{ success: false, reason: "<string>" }` to reject it and send a message to the client. Throwing an error in the handler also rejects the order.

This example shows how to grant an "extra life" in your fulfill endpoint when the user purchases the "god_mode" product (using Redis from `@devvit/web/server`):

server/index.ts

```
import type { PaymentHandlerResponse, Order } from "@devvit/web/server";import { redis } from "@devvit/web/server";const GOD_MODE_SKU = "god_mode";app.post("/internal/payments/fulfill", async (c) => { const order = await c.req.json(); if (!order.products.some((p) => p.sku === GOD_MODE_SKU)) { return c.json({ success: false, reason: "Unable to fulfill order: sku not found" }); } if (order.status !== "PAID") { return c.json({ success: false, reason: "Becoming a god has a cost (in Reddit Gold)" }); } const redisKey = `post:${order.postId}:user:${order.userId}:god_mode`; await redis.set(redisKey, "true"); return c.json({ success: true });});
```

## Implement payments

The frontend and backend of your app coordinate order processing.

To launch the payment flow, call `purchase(sku)` from `@devvit/web/client`. That triggers the native payment flow on all platforms (web, iOS, Android); Reddit then calls your server's fulfill endpoint. Your app can acknowledge or reject the order (for example, reject once a limited product is sold out).

### Get your product details

Server: Use `payments.getProducts()` in your server (see Server: Fetch products) and expose products via your own `/api/products` (or similar) endpoint if the client needs them.

Client: Fetch product metadata from your API and use it to display products and call `purchase(sku)`:

client/index.ts

```
import { purchase, OrderResultStatus } from "@devvit/web/client";// Fetch products from your server endpointconst products = await fetch("/api/products").then((r) => r.json());// Render your UI; when user chooses a product:async function handleBuy(sku: string) { const result = await purchase(sku); if (result.status === OrderResultStatus.STATUS_SUCCESS) { // show success } else { // show error or retry (result.errorMessage may be set) }}
```

### Initiate orders

Provide the product SKU to trigger a purchase. Use `purchase(sku)` from `@devvit/web/client`; the result indicates success or failure.

client/index.ts

```
import { purchase, OrderResultStatus } from "@devvit/web/client";export async function buy(sku: string) { const result = await purchase(sku); if (result.status === OrderResultStatus.STATUS_SUCCESS) { // show success } else { // show error or retry (result.errorMessage may be set) }}
```


<!-- ============ /docs/earn-money/payments/payments_test ============ -->

> source: https://developers.reddit.com/docs/earn-money/payments/payments_test

- 
- In-App Purchases
- Test Payments

# Test Payments

Use the payments sandbox environment to simulate payment transactions. All apps automatically start in the payments sandbox.

## Start a playtest

To test your app:

- Run `devvit upload` to upload your app to the Apps directory.

- Run `devvit playtest` .

Once you start a playtest session, a new pre-release version of your app is automatically created and installed on your test subreddit. The pre-release version has a fourth decimal place, so if your current app is 0.0.1, the first pre-release version will be 0.0.1.1.

The pre-release version is updated and uploaded to your test subreddit every time you save your app code. You’ll need to refresh your subreddit to see the updated app. This may take a couple of seconds, so be patient.

## Simulate purchases

In your test subreddit, you can make simulated purchases to test your app. No gold deducted in this state.

To end your playtest, press CTRL + C in the terminal session where you started it.


<!-- ============ /docs/earn-money/payments/payments_publish ============ -->

> source: https://developers.reddit.com/docs/earn-money/payments/payments_publish

- 
- In-App Purchases
- Publish your app

# Publish your app

note
The Developer Platform team reviews and approves apps and their products before products can be sold.

To publish your app:

- Run `devvit publish`.

- Select how you want your app to appear in the Apps directory:

- Unlisted means that the app is only visible to you in the directory, and you can install your app on larger subreddits that you moderate.

- Public means that your app is visible to all users in the Apps directory and can be installed by mods and admins across Reddit.

You can change your app visibility at any time. See publishing an app for details.

### Ineligible products

Any apps or products for which you wish to enable payments must comply with our Earn Policy and Devvit Guidelines.


<!-- ============ /docs/earn-money/payments/payments_manage ============ -->

> source: https://developers.reddit.com/docs/earn-money/payments/payments_manage

- 
- In-App Purchases
- Manage Payments

# Manage Payments

Once your app and products have been approved, you’re ready to use Reddit’s production payments system. Real payments will be triggered automatically when invoked from approved app versions. No code changes are required.

## Check orders

Reddit keeps track of historical purchases and lets you query orders.

In Devvit Web, use server-side `payments.getOrders()` from `@devvit/web/server`. Orders are returned in reverse chronological order and can be filtered by user, product, success state, or other attributes. Expose the data to your client via your own API (e.g. `/api/orders`) if the client needs it.

Example (server): expose orders for the current user so the client can show "Purchased!" or a purchase button.

server/index.ts

```
import { payments } from "@devvit/web/server";app.get("/api/orders", async (c) => { const orders = await payments.getOrders({ sku: "cosmic_sword" }); return c.json(orders);});
```

Client: call your `/api/orders` endpoint; if the user has already bought the product, show "Purchased!"; otherwise show a button that calls `purchase("cosmic_sword")` from `@devvit/web/client`.

## Update products

Once your app is in production, existing installations will need to be manually updated via the admin tool if you release a new version. Contact the Developer Platform team if you need to update your app installation versions.

Automatic updates will be supported in a future release.

## Issue a refund

Reddit may reverse transactions under certain circumstances, such as card disputes, policy violations, or technical issues. If there’s a problem with a digital good, a user can submit a request for a refund via Reddit Help.

When a transaction is reversed for any reason, you may optionally revoke product functionality from the user by implementing the refund endpoint (configured in `devvit.json` under `payments.endpoints.refundOrder`).

Example (Devvit Web): in your server’s refund endpoint, revoke the entitlement (e.g. decrement lives in Redis).

server/index.ts

```
import type { PaymentHandlerResponse, Order } from "@devvit/web/server";import { redis } from "@devvit/web/server";const GOD_MODE_SKU = "god_mode";app.post("/internal/payments/refund", async (c) => { const order = await c.req.json(); if (order.products.some((p) => p.sku === GOD_MODE_SKU)) { const livesKey = `${order.userId}:lives`; await redis.incrBy(livesKey, -1); } return c.json({ success: true });});
```

## Payments help

When you enable payments, a Get Payments Help menu item is automatically added to the three dot menu in your app. This connects the user to Reddit Help for assistance.


<!-- ============ /docs/earn-money/payments/support_this_app ============ -->

> source: https://developers.reddit.com/docs/earn-money/payments/support_this_app

- 
- In-App Purchases
- Support this app

# Support this app

You can ask users to contribute to your app’s development by adding the “support this app” feature. This allows users to support your app with Reddit Gold in exchange for some kind of award or recognition.

## Requirements

- You must give something in return to users who support your app. This could be unique custom user flair, an honorable mention in a thank you post, or another creative way to show your appreciation.

- The “Support this App” purchase button must meet the Developer Platform’s design guidelines.

## How to integrate app support

### Create the product

Use the Devvit CLI to generate the product configuration.

```
devvit products add support-app
```

### Add a payment handler

In Devvit Web, the payment handler is your server’s fulfill endpoint. That’s where you award the promised incentive (e.g. custom user flair). Implement it in your server and reference it in `devvit.json` under `payments.endpoints.fulfillOrder`.

Example: award custom user flair when a user completes a support purchase:

server/index.ts

```
import type { PaymentHandlerResponse, Order } from "@devvit/web/server";import { reddit } from "@devvit/web/server";app.post("/internal/payments/fulfill", async (c) => { const order = await c.req.json(); const username = order.userId; // or the username field on the order if (!username) { return c.json({ success: false, reason: "User not found" }); } const subredditName = order.subredditName ?? order.subredditId; await reddit.setUserFlair({ text: "Super Duper User", subredditName, username, backgroundColor: "#ffbea6", textColor: "dark", }); return c.json({ success: true });});
```

### Initiate purchases

Provide a way for users to support your app from your client:

- Devvit Web: Add a button or link that calls `purchase("support-app")` from `@devvit/web/client`. Handle the result (e.g. show a toast on success). Optionally fetch product info from your `/api/products` endpoint to display the support option.

- Follow the design guidelines when initiating purchases.

Example client code:

client/index.ts

```
import { purchase, OrderResultStatus } from "@devvit/web/client";async function handleSupportApp() { const result = await purchase("support-app"); if (result.status === OrderResultStatus.STATUS_SUCCESS) { // show success, e.g. toast: "Thanks for your support!" } else { // show error or retry (result.errorMessage may be set) }}
```

## Example

At r/BirbGame, they created the Birb Club. Members can join the club and get exclusive flair to support the app.


================================================================================
# Reddit API reference (selected — full classes available at /docs/api/redditapi/*; verify against @devvit/reddit .d.ts too)
================================================================================



<!-- ============ /docs/api/redditapi/RedditAPIClient/classes/RedditAPIClient ============ -->

> source: https://developers.reddit.com/docs/api/redditapi/RedditAPIClient/classes/RedditAPIClient

- 
- Reddit API
- Reddit API Client

# RedditAPIClient
@devvit/public-api v0.12.23-dev

# Class: RedditAPIClient

The Reddit API Client

To use the Reddit API Client, add it to the plugin configuration at the top of the file.

## Example

```
Devvit.configure({ redditAPI: true, // other plugins})// use within one of our capability handlers e.g. Menu Actions, Triggers, Scheduled Job Type, etcasync (event, context) => { const subreddit = await context.reddit.getSubredditById(context.subredditId); context.reddit.submitPost({ subredditName: subreddit.name, title: 'test post', text: 'test body', }) // additional code}
```

## Constructors

### new RedditAPIClient()

new RedditAPIClient(`metadata`): `RedditAPIClient`

#### Parameters

##### metadata

`Metadata`

#### Returns

`RedditAPIClient`

## Accessors

### modMail

#### Get Signature

get modMail(): `ModMailService`

Get ModMail API object

##### Example

```
await reddit.modMail.reply({ body: "Here is my message", conversationId: "abcd42";})
```

##### Returns

`ModMailService`

## Methods

### addEditorToWikiPage()

addEditorToWikiPage(`subredditName`, `page`, `username`): `Promise`<`void`>

Add an editor to a wiki page.

#### Parameters

##### subredditName

`string`

The name of the subreddit the wiki is in.

##### page

`string`

The name of the wiki page to add the editor to.

##### username

`string`

The username of the user to add as an editor.

#### Returns

`Promise`<`void`>

### addModNote()

addModNote(`options`): `Promise`<`ModNote`>

Add a mod note.

#### Parameters

##### options

`Prettify`

Options for the request

#### Returns

`Promise`<`ModNote`>

A Promise that resolves if the mod note was successfully added.

### addRemovalNote()

addRemovalNote(`options`): `Promise`<`void`>

Add a mod note for why a post or comment was removed

#### Parameters

##### options

`Prettify`

#### Returns

`Promise`<`void`>

### addSubredditRemovalReason()

addSubredditRemovalReason(`subredditName`, `options`): `Promise`<`string`>

Add a removal reason to a subreddit.

#### Parameters

##### subredditName

`string`

Name of the subreddit (e.g. `askReddit` or `r/askReddit`).

##### options

Options.

###### message

`string`

The message associated with the removal reason.

###### title

`string`

The title of the removal reason.

#### Returns

`Promise`<`string`>

Removal Reason ID

#### Example

```
const newReason = await reddit.addSubredditRemovalReasons( 'askReddit', { title: 'Spam', message: 'This is spam!' });console.log(newReason.id)
```

### addWidget()

addWidget(`widgetData`): `Promise`<`Widget`>

Add a widget to a subreddit.

#### Parameters

##### widgetData

`AddWidgetData`

The data for the widget to add.

#### Returns

`Promise`<`Widget`>

- The added Widget object.

### addWikiContributor()

addWikiContributor(`username`, `subredditName`): `Promise`<`void`>

Add a user as a wiki contributor for a subreddit.

#### Parameters

##### username

`string`

The username of the user to add as a wiki contributor. e.g. 'spez'

##### subredditName

`string`

The name of the subreddit to add the user as a wiki contributor. e.g. 'memes'

#### Returns

`Promise`<`void`>

### approve()

approve(`id`): `Promise`<`void`>

Approve a post or comment.

#### Parameters

##### id

`string`

The id of the post (t3_) or comment (t1_) to approve.

#### Returns

`Promise`<`void`>

#### Example

```
await reddit.approve('t3_123456');await reddit.approve('t1_123456');
```

### approveUser()

approveUser(`username`, `subredditName`): `Promise`<`void`>

Approve a user to post in a subreddit.

#### Parameters

##### username

`string`

The username of the user to approve. e.g. 'spez'

##### subredditName

`string`

The name of the subreddit to approve the user in. e.g. 'memes'

#### Returns

`Promise`<`void`>

### banUser()

banUser(`options`): `Promise`<`void`>

Ban a user from a subreddit.

#### Parameters

##### options

`BanUserOptions`

Options for the request

#### Returns

`Promise`<`void`>

### banWikiContributor()

banWikiContributor(`options`): `Promise`<`void`>

Ban a user from contributing to the wiki on a subreddit.

#### Parameters

##### options

`BanWikiContributorOptions`

Options for the request

#### Returns

`Promise`<`void`>

### createPostFlairTemplate()

createPostFlairTemplate(`options`): `Promise`<`FlairTemplate`>

Create a post flair template for a subreddit.

#### Parameters

##### options

`CreateFlairTemplateOptions`

Options for the request

#### Returns

`Promise`<`FlairTemplate`>

The created FlairTemplate object.

### createRule()

createRule(`subredditName`, `options`): `Promise`<`void`>

Create a new rule in a subreddit.

#### Parameters

##### subredditName

`string`

The name of the subreddit to add the rule to.

##### options

`CreateRuleOptions`

#### Returns

`Promise`<`void`>

### createUserFlairTemplate()

createUserFlairTemplate(`options`): `Promise`<`FlairTemplate`>

Create a user flair template for a subreddit.

#### Parameters

##### options

`CreateFlairTemplateOptions`

Options for the request

#### Returns

`Promise`<`FlairTemplate`>

The created FlairTemplate object.

### createWikiPage()

createWikiPage(`options`): `Promise`<`WikiPage`>

Create a new wiki page for a subreddit.

#### Parameters

##### options

`CreateWikiPageOptions`

Options for the request

#### Returns

`Promise`<`WikiPage`>

- The created WikiPage object.

### crosspost()

crosspost(`options`): `Promise`<`Post`>

Crossposts a post to a subreddit.

#### Parameters

##### options

`CrosspostOptions`

Options for crossposting a post

#### Returns

`Promise`<`Post`>

- A Promise that resolves to a Post object.

### deleteFlairTemplate()

deleteFlairTemplate(`subredditName`, `flairTemplateId`): `Promise`<`void`>

Delete a flair template from a subreddit.

#### Parameters

##### subredditName

`string`

The name of the subreddit to delete the flair template from.

##### flairTemplateId

`string`

The ID of the flair template to delete.

#### Returns

`Promise`<`void`>

### deleteModNote()

deleteModNote(`options`): `Promise`<`boolean`>

Delete a mod note.

#### Parameters

##### options

`Prettify`

Options for the request

#### Returns

`Promise`<`boolean`>

True if it was deleted successfully; false otherwise.

### deleteSubredditRemovalReason()

deleteSubredditRemovalReason(`subredditName`, `reasonId`): `Promise`<`void`>

Delete a removal reason from a subreddit.

#### Parameters

##### subredditName

`string`

Name of the subreddit (e.g. `askReddit` or `r/askReddit`).

##### reasonId

`string`

ID of the removal reason (from get or add).

#### Returns

`Promise`<`void`>

### deleteWidget()

deleteWidget(`subredditName`, `widgetId`): `Promise`<`void`>

Delete a widget from a subreddit.

#### Parameters

##### subredditName

`string`

The name of the subreddit to delete the widget from.

##### widgetId

`string`

The ID of the widget to delete.

#### Returns

`Promise`<`void`>

### editFlairTemplate()

editFlairTemplate(`options`): `Promise`<`FlairTemplate`>

Edit a flair template for a subreddit. This can be either a post or user flair template.
Note: If you leave any of the options fields as undefined, they will reset to their default values.

#### Parameters

##### options

`EditFlairTemplateOptions`

Options for the request

#### Returns

`Promise`<`FlairTemplate`>

The edited FlairTemplate object.

### getApprovedUsers()

getApprovedUsers(`options`): `Listing`<`User`>

Get a list of users who have been approved to post in a subreddit.

#### Parameters

##### options

`GetSubredditUsersOptions`

Options for the request

#### Returns

`Listing`<`User`>

A Listing of User objects.

### getAppUser()

getAppUser(): `Promise`<`User`>

Get the user that the app runs as on the provided metadata.

#### Returns

`Promise`<`User`>

A Promise that resolves to a User object.

#### Example

```
const user = await reddit.getAppUser(metadata);
```

### getBannedUsers()

getBannedUsers(`options`): `Listing`<`User`>

Get a list of users who are banned from a subreddit.

#### Parameters

##### options

`GetSubredditUsersOptions`

Options for the request

#### Returns

`Listing`<`User`>

A Listing of User objects.

### getBannedWikiContributors()

getBannedWikiContributors(`options`): `Listing`<`User`>

Get a list of users who are banned from contributing to the wiki on a subreddit.

#### Parameters

##### options

`GetSubredditUsersOptions`

Options for the request

#### Returns

`Listing`<`User`>

A Listing of User objects.

### getBestPosts()

getBestPosts(`options`): `Listing`<`Post`>

Get a list of best posts from the front page.
This method will get the front page for the app account by default.
To get the front page for a user, please contact Reddit.

#### Parameters

##### options

`ListingFetchOptions`

Options for the request

#### Returns

`Listing`<`Post`>

A Listing of Post objects.

#### Example

```
const posts = await reddit.getBestPosts({ limit: 1000, pageSize: 100}).all();
```

### getCommentById()

getCommentById(`id`): `Promise`<`Comment`>

Get a Comment object by ID

#### Parameters

##### id

`string`

The ID (starting with t1_) of the comment to retrieve. e.g. t1_1qjpg

#### Returns

`Promise`<`Comment`>

A Promise that resolves to a Comment object.

#### Example

```
const comment = await reddit.getCommentById('t1_1qjpg');
```

### getComments()

getComments(`options`): `Listing`<`Comment`>

Get a list of comments from a specific post or comment.

#### Parameters

##### options

`GetCommentsOptions`

Options for the request

#### Returns

`Listing`<`Comment`>

A Listing of Comment objects.

#### Example

```
const comments = await reddit.getComments({ postId: 't3_1qjpg', limit: 1000, pageSize: 100}).all();
```

### getCommentsAndPostsByUser()

getCommentsAndPostsByUser(`options`): `Listing`<`Post` | `Comment`>

Get a list of posts and comments from a specific user.

#### Parameters

##### options

`GetUserOverviewOptions`

Options for the request

#### Returns

`Listing`<`Post` | `Comment`>

A Listing of `Post` and `Comment` objects.

### getCommentsByUser()

getCommentsByUser(`options`): `Listing`<`Comment`>

Get a list of comments by a specific user.

#### Parameters

##### options

`GetCommentsByUserOptions`

Options for the request

#### Returns

`Listing`<`Comment`>

A Listing of Comment objects.

### getControversialPosts()

getControversialPosts(`options`): `Listing`<`Post`>

Get a list of controversial posts from a specific subreddit.

#### Parameters

##### options

`GetPostsOptionsWithTimeframe`

Options for the request

#### Returns

`Listing`<`Post`>

A Listing of Post objects.

#### Example

```
const posts = await reddit.getControversialPosts({ subredditName: 'memes', timeframe: 'day', limit: 1000, pageSize: 100}).all();
```

### getCurrentSubreddit()

getCurrentSubreddit(): `Promise`<`Subreddit`>

Retrieves the current subreddit.

#### Returns

`Promise`<`Subreddit`>

A Promise that resolves a Subreddit object.

#### Example

```
const currentSubreddit = await reddit.getCurrentSubreddit();
```

### getCurrentSubredditName()

getCurrentSubredditName(): `Promise`<`string`>

Retrieves the name of the current subreddit.

#### Returns

`Promise`<`string`>

A Promise that resolves a string representing the current subreddit's name.

#### Example

```
const currentSubredditName = await reddit.getCurrentSubredditName();
```

### getCurrentUser()

getCurrentUser(): `Promise`<`undefined` | `User`>

Get the current calling user.
Resolves to undefined for logged-out custom post renders.

#### Returns

`Promise`<`undefined` | `User`>

A Promise that resolves to a User object or undefined

#### Example

```
const user = await reddit.getCurrentUser();
```

### getCurrentUsername()

getCurrentUsername(): `Promise`<`undefined` | `string`>

Get the current calling user's username.
Resolves to undefined for logged-out custom post renders.

#### Returns

`Promise`<`undefined` | `string`>

A Promise that resolves to a string representing the username or undefined

#### Example

```
const username = await reddit.getCurrentUsername();
```

### getDuplicatesForPost()

getDuplicatesForPost(`options`): `Listing`<`Post`>

Get posts that shared the same link as the given post.

#### Parameters

##### options

`GetDuplicatesOptions`

Options for the request. Post ID is required, eveything else is optional.

#### Returns

`Listing`<`Post`>

A Listing of Post objects.

#### Example

```
const duplicates = await reddit.getDuplicatesForPost({ postId: 't3_abc123', sort: 'num_comments', limit: 100}).all();
```

### getEdited()

#### Call Signature

getEdited(`options`): `Listing`<`Comment`>

Return a listing of things that have been edited recently.

##### Parameters

###### options

`ModLogOptions`<`"comment"`>

##### Returns

`Listing`<`Comment`>

##### Example

```
const subreddit = await reddit.getSubredditByName("mysubreddit")let listing = await subreddit.getEdited();console.log("Posts and Comments: ", await listing.all())listing = await subreddit.getEdited({ type: "post"});console.log("Posts: ", await listing.all())
```

#### Call Signature

getEdited(`options`): `Listing`<`Post`>

Return a listing of things that have been edited recently.

##### Parameters

###### options

`ModLogOptions`<`"post"`>

##### Returns

`Listing`<`Post`>

##### Example

```
const subreddit = await reddit.getSubredditByName("mysubreddit")let listing = await subreddit.getEdited();console.log("Posts and Comments: ", await listing.all())listing = await subreddit.getEdited({ type: "post"});console.log("Posts: ", await listing.all())
```

#### Call Signature

getEdited(`options`): `Listing`<`Post` | `Comment`>

Return a listing of things that have been edited recently.

##### Parameters

###### options

`ModLogOptions`<`"all"`>

##### Returns

`Listing`<`Post` | `Comment`>

##### Example

```
const subreddit = await reddit.getSubredditByName("mysubreddit")let listing = await subreddit.getEdited();console.log("Posts and Comments: ", await listing.all())listing = await subreddit.getEdited({ type: "post"});console.log("Posts: ", await listing.all())
```

### getHotPosts()

getHotPosts(`options`): `Listing`<`Post`>

Get a list of hot posts from a specific subreddit.

#### Parameters

##### options

`GetHotPostsOptions`

Options for the request

#### Returns

`Listing`<`Post`>

A Listing of Post objects.

#### Example

```
const posts = await reddit.getHotPosts({ subredditName: 'memes', timeframe: 'day', limit: 1000, pageSize: 100}).all();
```

### getMessages()

getMessages(`options`): `Promise`<`Listing`<`PrivateMessage`>>

Get private messages sent to the currently authenticated user.

#### Parameters

##### options

`Prettify`

Options for the request

#### Returns

`Promise`<`Listing`<`PrivateMessage`>>

### getModerationLog()

getModerationLog(`options`): `Listing`<`ModAction`>

Get the moderation log for a subreddit.

#### Parameters

##### options

`GetModerationLogOptions`

Options for the request

#### Returns

`Listing`<`ModAction`>

A Listing of ModAction objects.

#### Example

```
const modActions = await reddit.getModerationLog({ subredditName: 'memes', moderatorUsernames: ['spez'], type: 'banuser', limit: 1000, pageSize: 100}).all();
```

### getModerators()

getModerators(`options`): `Listing`<`User`>

Get a list of users who are moderators for a subreddit.

#### Parameters

##### options

`GetSubredditUsersOptions`

Options for the request

#### Returns

`Listing`<`User`>

A Listing of User objects.

### getModNotes()

getModNotes(`options`): `Listing`<`ModNote`>

Get a list of mod notes related to a user in a subreddit.

#### Parameters

##### options

`Prettify`

Options for the request

#### Returns

`Listing`<`ModNote`>

A listing of ModNote objects.

### getModQueue()

#### Call Signature

getModQueue(`options`): `Listing`<`Comment`>

Return a listing of things requiring moderator review, such as reported things and items.

##### Parameters

###### options

`ModLogOptions`<`"comment"`>

##### Returns

`Listing`<`Comment`>

##### Example

```
const subreddit = await reddit.getSubredditByName("mysubreddit")let listing = await subreddit.getModQueue();console.log("Posts and Comments: ", await listing.all())listing = await subreddit.getModQueue({ type: "post"});console.log("Posts: ", await listing.all())
```

#### Call Signature

getModQueue(`options`): `Listing`<`Post`>

Return a listing of things requiring moderator review, such as reported things and items.

##### Parameters

###### options

`ModLogOptions`<`"post"`>

##### Returns

`Listing`<`Post`>

##### Example

```
const subreddit = await reddit.getSubredditByName("mysubreddit")let listing = await subreddit.getModQueue();console.log("Posts and Comments: ", await listing.all())listing = await subreddit.getModQueue({ type: "post"});console.log("Posts: ", await listing.all())
```

#### Call Signature

getModQueue(`options`): `Listing`<`Post` | `Comment`>

Return a listing of things requiring moderator review, such as reported things and items.

##### Parameters

###### options

`ModLogOptions`<`"all"`>

##### Returns

`Listing`<`Post` | `Comment`>

##### Example

```
const subreddit = await reddit.getSubredditByName("mysubreddit")let listing = await subreddit.getModQueue();console.log("Posts and Comments: ", await listing.all())listing = await subreddit.getModQueue({ type: "post"});console.log("Posts: ", await listing.all())
```

### getMutedUsers()

getMutedUsers(`options`): `Listing`<`User`>

Get a list of users who are muted in a subreddit.

#### Parameters

##### options

`GetSubredditUsersOptions`

Options for the request

#### Returns

`Listing`<`User`>

A listing of User objects.

### getNewPosts()

getNewPosts(`options`): `Listing`<`Post`>

Get a list of new posts from a specific subreddit.

#### Parameters

##### options

`GetPostsOptions`

Options for the request

#### Returns

`Listing`<`Post`>

A Listing of Post objects.

#### Example

```
const posts = await reddit.getNewPosts({ subredditName: 'memes', limit: 1000, pageSize: 100}).all();
```

### getPostById()

getPostById(`id`): `Promise`<`Post`>

Gets a Post object by ID

#### Parameters

##### id

`string`

#### Returns

`Promise`<`Post`>

A Promise that resolves to a Post object.

### getPostFlairTemplates()

getPostFlairTemplates(`subredditName`): `Promise`<`FlairTemplate`[]>

Get the list of post flair templates for a subreddit.

#### Parameters

##### subredditName

`string`

The name of the subreddit to get the post flair templates for.

#### Returns

`Promise`<`FlairTemplate`[]>

A Promise that resolves with an array of FlairTemplate objects.

### getPostsByUser()

getPostsByUser(`options`): `Listing`<`Post`>

Get a list of posts from a specific user.

#### Parameters

##### options

`GetPostsByUserOptions`

Options for the request

#### Returns

`Listing`<`Post`>

A Listing of Post objects.

### getReports()

#### Call Signature

getReports(`options`): `Listing`<`Comment`>

Return a listing of things that have been reported.

##### Parameters

###### options

`ModLogOptions`<`"comment"`>

##### Returns

`Listing`<`Comment`>

##### Example

```
const subreddit = await reddit.getSubredditByName("mysubreddit")let listing = await subreddit.getReports();console.log("Posts and Comments: ", await listing.all())listing = await subreddit.getReports({ type: "post"});console.log("Posts: ", await listing.all())
```

#### Call Signature

getReports(`options`): `Listing`<`Post`>

Return a listing of things that have been reported.

##### Parameters

###### options

`ModLogOptions`<`"post"`>

##### Returns

`Listing`<`Post`>

##### Example

```
const subreddit = await reddit.getSubredditByName("mysubreddit")let listing = await subreddit.getReports();console.log("Posts and Comments: ", await listing.all())listing = await subreddit.getReports({ type: "post"});console.log("Posts: ", await listing.all())
```

#### Call Signature

getReports(`options`): `Listing`<`Post` | `Comment`>

Return a listing of things that have been reported.

##### Parameters

###### options

`ModLogOptions`<`"all"`>

##### Returns

`Listing`<`Post` | `Comment`>

##### Example

```
const subreddit = await reddit.getSubredditByName("mysubreddit")let listing = await subreddit.getReports();console.log("Posts and Comments: ", await listing.all())listing = await subreddit.getReports({ type: "post"});console.log("Posts: ", await listing.all())
```

### getRisingPosts()

getRisingPosts(`options`): `Listing`<`Post`>

Get a list of hot posts from a specific subreddit.

#### Parameters

##### options

`GetPostsOptions`

Options for the request

#### Returns

`Listing`<`Post`>

A Listing of Post objects.

#### Example

```
const posts = await reddit.getRisingPosts({ subredditName: 'memes', timeframe: 'day', limit: 1000, pageSize: 100}).all();
```

### getRules()

getRules(`subredditName`): `Promise`<`Rule`[]>

Get the rules for a subreddit.

#### Parameters

##### subredditName

`string`

The name of the subreddit to get the rules for.

#### Returns

`Promise`<`Rule`[]>

An array of Rule objects.

### getSnoovatarUrl()

getSnoovatarUrl(`username`): `Promise`<`undefined` | `string`>

Get the snoovatar URL for a given username.

#### Parameters

##### username

`string`

The username of the snoovatar to retrieve

#### Returns

`Promise`<`undefined` | `string`>

A Promise that resolves to a URL of the snoovatar image if it exists.

### getSpam()

#### Call Signature

getSpam(`options`): `Listing`<`Comment`>

Return a listing of things that have been marked as spam or otherwise removed.

##### Parameters

###### options

`ModLogOptions`<`"comment"`>

##### Returns

`Listing`<`Comment`>

##### Example

```
const subreddit = await reddit.getSubredditByName("mysubreddit")let listing = await subreddit.getSpam();console.log("Posts and Comments: ", await listing.all())listing = await subreddit.getSpam({ type: "post"});console.log("Posts: ", await listing.all())
```

#### Call Signature

getSpam(`options`): `Listing`<`Post`>

Return a listing of things that have been marked as spam or otherwise removed.

##### Parameters

###### options

`ModLogOptions`<`"post"`>

##### Returns

`Listing`<`Post`>

##### Example

```
const subreddit = await reddit.getSubredditByName("mysubreddit")let listing = await subreddit.getSpam();console.log("Posts and Comments: ", await listing.all())listing = await subreddit.getSpam({ type: "post"});console.log("Posts: ", await listing.all())
```

#### Call Signature

getSpam(`options`): `Listing`<`Post` | `Comment`>

Return a listing of things that have been marked as spam or otherwise removed.

##### Parameters

###### options

`ModLogOptions`<`"all"`>

##### Returns

`Listing`<`Post` | `Comment`>

##### Example

```
const subreddit = await reddit.getSubredditByName("mysubreddit")let listing = await subreddit.getSpam();console.log("Posts and Comments: ", await listing.all())listing = await subreddit.getSpam({ type: "post"});console.log("Posts: ", await listing.all())
```

### getSubredditById()

getSubredditById(`id`): `Promise`<`undefined` | `Subreddit`>

Gets a Subreddit object by ID

#### Parameters

##### id

`string`

The ID (starting with t5_) of the subreddit to retrieve. e.g. t5_2qjpg

#### Returns

`Promise`<`undefined` | `Subreddit`>

A Promise that resolves a Subreddit object.

#### Deprecated

Use getSubredditInfoById instead.

#### Example

```
const memes = await reddit.getSubredditById('t5_2qjpg');
```

### getSubredditByName()

getSubredditByName(`name`): `Promise`<`Subreddit`>

Gets a Subreddit object by name

#### Parameters

##### name

`string`

The name of a subreddit omitting the r/. This is case insensitive.

#### Returns

`Promise`<`Subreddit`>

A Promise that resolves a Subreddit object.

#### Deprecated

Use getSubredditInfoByName instead.

#### Example

```
const askReddit = await reddit.getSubredditByName('askReddit');
```

### getSubredditInfoById()

getSubredditInfoById(`id`): `Promise`<`SubredditInfo`>

Gets a SubredditInfo object by ID

#### Parameters

##### id

`string`

The ID (starting with t5_) of the subreddit to retrieve. e.g. t5_2qjpg

#### Returns

`Promise`<`SubredditInfo`>

A Promise that resolves a SubredditInfo object.

#### Example

```
const memes = await reddit.getSubredditInfoById('t5_2qjpg');
```

### getSubredditInfoByName()

getSubredditInfoByName(`name`): `Promise`<`SubredditInfo`>

Gets a SubredditInfo object by name

#### Parameters

##### name

`string`

The name of a subreddit omitting the r/. This is case insensitive.

#### Returns

`Promise`<`SubredditInfo`>

A Promise that resolves a SubredditInfo object.

#### Example

```
const askReddit = await reddit.getSubredditInfoByName('askReddit');
```

### getSubredditLeaderboard()

getSubredditLeaderboard(`subredditId`): `Promise`<`SubredditLeaderboard`>

Returns a leaderboard for a given subreddit ID.

#### Parameters

##### subredditId

`string`

ID of the subreddit for which the leaderboard is being queried.

#### Returns

`Promise`<`SubredditLeaderboard`>

Leaderboard for the given subreddit.

### getSubredditRemovalReasons()

getSubredditRemovalReasons(`subredditName`): `Promise`<`RemovalReason`[]>

Get the list of subreddit's removal reasons (ordered).

#### Parameters

##### subredditName

`string`

Name of the subreddit (e.g. `askReddit` or `r/askReddit`).

#### Returns

`Promise`<`RemovalReason`[]>

Ordered array of plain removal reason objects.

#### Example

```
const reasons = await reddit.getSubredditRemovalReasons('askReddit');const sub = await reddit.getSubredditByName('askReddit');for (const reason of reasons) { console.log(reason.id, reason.message, reason.title); await sub.updateRemovalReason(reason.id, { title: 'Spam', message: 'Updated.' }); await sub.deleteRemovalReason(reason.id);}
```

### getSubredditStyles()

getSubredditStyles(`subredditId`): `Promise`<`SubredditStyles`>

Returns the styles for a given subreddit ID.

#### Parameters

##### subredditId

`string`

ID of the subreddit from which to retrieve the styles.

#### Returns

`Promise`<`SubredditStyles`>

Styles for the given subreddit.

### getTopPosts()

getTopPosts(`options`): `Listing`<`Post`>

Get a list of controversial posts from a specific subreddit.

#### Parameters

##### options

`GetPostsOptionsWithTimeframe`

Options for the request

#### Returns

`Listing`<`Post`>

A Listing of Post objects.

#### Example

```
const posts = await reddit.getControversialPosts({ subredditName: 'memes', timeframe: 'day', limit: 1000, pageSize: 100}).all();
```

### getUnmoderated()

#### Call Signature

getUnmoderated(`options`): `Listing`<`Comment`>

Return a listing of things that have yet to be approved/removed by a mod.

##### Parameters

###### options

`ModLogOptions`<`"comment"`>

##### Returns

`Listing`<`Comment`>

##### Example

```
const subreddit = await reddit.getSubredditByName("mysubreddit")let listing = await subreddit.getUnmoderated();console.log("Posts and Comments: ", await listing.all())listing = await subreddit.getUnmoderated({ type: "post"});console.log("Posts: ", await listing.all())
```

#### Call Signature

getUnmoderated(`options`): `Listing`<`Post`>

Return a listing of things that have yet to be approved/removed by a mod.

##### Parameters

###### options

`ModLogOptions`<`"post"`>

##### Returns

`Listing`<`Post`>

##### Example

```
const subreddit = await reddit.getSubredditByName("mysubreddit")let listing = await subreddit.getUnmoderated();console.log("Posts and Comments: ", await listing.all())listing = await subreddit.getUnmoderated({ type: "post"});console.log("Posts: ", await listing.all())
```

#### Call Signature

getUnmoderated(`options`): `Listing`<`Post` | `Comment`>

Return a listing of things that have yet to be approved/removed by a mod.

##### Parameters

###### options

`ModLogOptions`<`"all"`>

##### Returns

`Listing`<`Post` | `Comment`>

##### Example

```
const subreddit = await reddit.getSubredditByName("mysubreddit")let listing = await subreddit.getUnmoderated();console.log("Posts and Comments: ", await listing.all())listing = await subreddit.getUnmoderated({ type: "post"});console.log("Posts: ", await listing.all())
```

### getUserById()

getUserById(`id`): `Promise`<`undefined` | `User`>

Gets a User object by ID

#### Parameters

##### id

`string`

The ID (starting with t2_) of the user to retrieve. e.g. t2_1qjpg

#### Returns

`Promise`<`undefined` | `User`>

A Promise that resolves to a User object.

#### Example

```
const user = await reddit.getUserById('t2_1qjpg');
```

### getUserByUsername()

getUserByUsername(`username`): `Promise`<`undefined` | `User`>

Gets a User object by username

#### Parameters

##### username

`string`

The username of the user omitting the u/. e.g. 'devvit'

#### Returns

`Promise`<`undefined` | `User`>

A Promise that resolves to a User object or undefined if user is
not found (user doesn't exist, account suspended, etc).

#### Example

```
const user = await reddit.getUserByUsername('devvit');if (user) { console.log(user)}
```

### getUserFlairTemplates()

getUserFlairTemplates(`subredditName`): `Promise`<`FlairTemplate`[]>

Get the list of user flair templates for a subreddit.

#### Parameters

##### subredditName

`string`

The name of the subreddit to get the user flair templates for.

#### Returns

`Promise`<`FlairTemplate`[]>

A Promise that resolves with an array of FlairTemplate objects.

### getUserKarmaFromCurrentSubreddit()

getUserKarmaFromCurrentSubreddit(`username`): `Promise`<`GetUserKarmaForSubredditResponse`>

Returns the karma for a given user in the current subreddit.
The user making the request must be a moderator of the subreddit to read another user's karma in the subreddit.
An exception is if the specified user is the same as the user making the request.

#### Parameters

##### username

`string`

The username of the user to get the karma for. e.g. 'spez'

#### Returns

`Promise`<`GetUserKarmaForSubredditResponse`>

The GetUserKarmaForSubredditResponse, containing the user's karma for posts and comments in the subreddit.

### getVaultByAddress()

getVaultByAddress(`address`): `Promise`<`Vault`>

Gets a Vault for the specified address.

#### Parameters

##### address

`string`

The address (starting with 0x) of the Vault.

#### Returns

`Promise`<`Vault`>

#### Example

```
const vault = await reddit.getVaultByAddress('0x205ee28744456bDBf180A0Fa7De51e0F116d54Ed');
```

### getVaultByUserId()

getVaultByUserId(`userId`): `Promise`<`Vault`>

Gets a Vault for the specified user.

#### Parameters

##### userId

`string`

The ID (starting with t2_) of the Vault owner.

#### Returns

`Promise`<`Vault`>

#### Example

```
const vault = await reddit.getVaultByUserId('t2_1w72');
```

### getWidgets()

getWidgets(`subredditName`): `Promise`<`Widget`[]>

Get the widgets for a subreddit.

#### Parameters

##### subredditName

`string`

The name of the subreddit to get the widgets for.

#### Returns

`Promise`<`Widget`[]>

- An array of Widget objects.

### getWikiContributors()

getWikiContributors(`options`): `Listing`<`User`>

Get a list of users who are wiki contributors of a subreddit.

#### Parameters

##### options

`GetSubredditUsersOptions`

Options for the request

#### Returns

`Listing`<`User`>

A Listing of User objects.

### getWikiPage()

getWikiPage(`subredditName`, `page`, `revisionId`?): `Promise`<`WikiPage`>

Get a wiki page from a subreddit.

#### Parameters

##### subredditName

`string`

The name of the subreddit to get the wiki page from.

##### page

`string`

The name of the wiki page to get.

##### revisionId?

``${string}-${string}-${string}-${string}-${string}``

The revision ID of the wiki page version to get. Setting this value will return the wiki page
version at that revision, and leaving it empty will return the latest version.

#### Returns

`Promise`<`WikiPage`>

The requested WikiPage object.

### getWikiPageRevisions()

getWikiPageRevisions(`options`): `Listing`<`WikiPageRevision`>

Get the revisions for a wiki page.

#### Parameters

##### options

`GetPageRevisionsOptions`

Options for the request

#### Returns

`Listing`<`WikiPageRevision`>

A Listing of WikiPageRevision objects.

### getWikiPages()

getWikiPages(`subredditName`): `Promise`<`string`[]>

Get the wiki pages for a subreddit.

#### Parameters

##### subredditName

`string`

The name of the subreddit to get the wiki pages from.

#### Returns

`Promise`<`string`[]>

A list of the wiki page names for the subreddit.

### getWikiPageSettings()

getWikiPageSettings(`subredditName`, `page`): `Promise`<`WikiPageSettings`>

Get the settings for a wiki page.

#### Parameters

##### subredditName

`string`

The name of the subreddit the wiki is in.

##### page

`string`

The name of the wiki page to get the settings for.

#### Returns

`Promise`<`WikiPageSettings`>

A WikiPageSettings object.

### inviteModerator()

inviteModerator(`options`): `Promise`<`void`>

Invite a user to become a moderator of a subreddit.

#### Parameters

##### options

`InviteModeratorOptions`

Options for the request

#### Returns

`Promise`<`void`>

### markAllMessagesAsRead()

markAllMessagesAsRead(): `Promise`<`void`>

Mark all private messages as read.

#### Returns

`Promise`<`void`>

### muteUser()

muteUser(`options`): `Promise`<`void`>

Mute a user in a subreddit. Muting a user prevents them from sending modmail.

#### Parameters

##### options

`MuteUserOptions`

Options for the request

#### Returns

`Promise`<`void`>

### remove()

remove(`id`, `isSpam`): `Promise`<`void`>

Remove a post or comment.

#### Parameters

##### id

`string`

The id of the post (t3_) or comment (t1_) to remove.

##### isSpam

`boolean`

Is the post or comment being removed because it's spam?

#### Returns

`Promise`<`void`>

#### Example

```
await reddit.remove('t3_123456', false);await reddit.remove('t1_123456', true);
```

### removeEditorFromWikiPage()

removeEditorFromWikiPage(`subredditName`, `page`, `username`): `Promise`<`void`>

Remove an editor from a wiki page.

#### Parameters

##### subredditName

`string`

The name of the subreddit the wiki is in.

##### page

`string`

The name of the wiki page to remove the editor from.

##### username

`string`

The username of the user to remove as an editor.

#### Returns

`Promise`<`void`>

### removeModerator()

removeModerator(`username`, `subredditName`): `Promise`<`void`>

Remove a user as a moderator of a subreddit.

#### Parameters

##### username

`string`

The username of the user to remove as a moderator. e.g. 'spez'

##### subredditName

`string`

The name of the subreddit to remove the user as a moderator from. e.g. 'memes'

#### Returns

`Promise`<`void`>

### removePostFlair()

removePostFlair(`subredditName`, `postId`): `Promise`<`void`>

Remove the flair for a post in a subreddit.

#### Parameters

##### subredditName

`string`

The name of the subreddit to remove the flair from.

##### postId

`string`

The ID of the post to remove the flair from.

#### Returns

`Promise`<`void`>

### removeUser()

removeUser(`username`, `subredditName`): `Promise`<`void`>

Remove a user's approval to post in a subreddit.

#### Parameters

##### username

`string`

The username of the user to remove approval from. e.g. 'spez'

##### subredditName

`string`

The name of the subreddit to remove the user's approval from. e.g. 'memes'

#### Returns

`Promise`<`void`>

### removeUserFlair()

removeUserFlair(`subredditName`, `username`): `Promise`<`void`>

Remove the flair for a user in a subreddit.

#### Parameters

##### subredditName

`string`

The name of the subreddit to remove the flair from.

##### username

`string`

The username of the user to remove the flair from.

#### Returns

`Promise`<`void`>

### removeWikiContributor()

removeWikiContributor(`username`, `subredditName`): `Promise`<`void`>

Remove a user's wiki contributor status for a subreddit.

#### Parameters

##### username

`string`

The username of the user to remove wiki contributor status from. e.g. 'spez'

##### subredditName

`string`

The name of the subreddit to remove the user's wiki contributor status from. e.g. 'memes'

#### Returns

`Promise`<`void`>

### reorderRules()

reorderRules(`subredditName`, `rules`): `Promise`<`void`>

Reorder the rules in a subreddit.

#### Parameters

##### subredditName

`string`

The name of the subreddit to reorder the rules for.

##### rules

`Rule`[]

Array of Rule objects in the desired order (order is determined by array position).

#### Returns

`Promise`<`void`>

### reorderWidgets()

reorderWidgets(`subredditName`, `orderByIds`): `Promise`<`void`>

Reorder the widgets for a subreddit.

#### Parameters

##### subredditName

`string`

The name of the subreddit to reorder the widgets for.

##### orderByIds

`string`[]

An array of widget IDs in the order that they should be displayed.

#### Returns

`Promise`<`void`>

### report()

report(`thing`, `options`): `Promise`<`JsonStatus`>

Report a Post or Comment

The report is sent to the moderators of the subreddit for review.

#### Parameters

##### thing

Post or Comment

`Post` | `Comment`

##### options

Options

###### reason

`string`

Why the thing is reported

#### Returns

`Promise`<`JsonStatus`>

#### Example

```
await reddit.report(post, { reason: 'This is spam!',})
```

### revertWikiPage()

revertWikiPage(`subredditName`, `page`, `revisionId`): `Promise`<`void`>

Revert a wiki page to a previous revision.

#### Parameters

##### subredditName

`string`

The name of the subreddit the wiki is in.

##### page

`string`

The name of the wiki page to revert.

##### revisionId

`string`

The ID of the revision to revert to.

#### Returns

`Promise`<`void`>

### revokeModeratorInvite()

revokeModeratorInvite(`username`, `subredditName`): `Promise`<`void`>

Revoke a moderator invite for a user to a subreddit.

#### Parameters

##### username

`string`

The username of the user to revoke the invite for. e.g. 'spez'

##### subredditName

`string`

The name of the subreddit to revoke the invite for. e.g. 'memes'

#### Returns

`Promise`<`void`>

### sendPrivateMessage()

sendPrivateMessage(`options`): `Promise`<`void`>

Sends a private message to a user.

#### Parameters

##### options

`SendPrivateMessageOptions`

The options for sending the message.

#### Returns

`Promise`<`void`>

A Promise that resolves if the private message was successfully sent.

### sendPrivateMessageAsSubreddit()

sendPrivateMessageAsSubreddit(`options`): `Promise`<`void`>

Sends a private message to a user on behalf of a subreddit.

#### Parameters

##### options

`SendPrivateMessageAsSubredditOptions`

The options for sending the message as a subreddit.

#### Returns

`Promise`<`void`>

A Promise that resolves if the private message was successfully sent.

#### Deprecated

No longer working as expected. Use modMail.createConversation with `isAuthorHidden: true` instead

### setModeratorPermissions()

setModeratorPermissions(`username`, `subredditName`, `permissions`): `Promise`<`void`>

Update the permissions of a moderator of a subreddit.

#### Parameters

##### username

`string`

The username of the user to update the permissions for. e.g. 'spez'

##### subredditName

`string`

The name of the subreddit. e.g. 'memes'

##### permissions

`ModeratorPermission`[]

The permissions to give the user. e.g ['posts', 'wiki']

#### Returns

`Promise`<`void`>

### setPostFlair()

setPostFlair(`options`): `Promise`<`void`>

Set the flair for a post in a subreddit.

#### Parameters

##### options

`SetPostFlairOptions`

Options for the request

#### Returns

`Promise`<`void`>

### setUserFlair()

setUserFlair(`options`): `Promise`<`void`>

Set the flair for a user in a subreddit.

#### Parameters

##### options

`SetUserFlairOptions`

Options for the request

#### Returns

`Promise`<`void`>

### setUserFlairBatch()

setUserFlairBatch(`subredditName`, `flairs`): `Promise`<`FlairCsvResult`[]>

Set the flair of multiple users in the same subreddit with a single API call.
Can process up to 100 entries at once.

#### Parameters

##### subredditName

`string`

The name of the subreddit to edit flairs in.

##### flairs

`SetUserFlairBatchConfig`[]

Array of user flair configuration objects. If both text and cssClass are empty for a given user the flair will be cleared.

#### Returns

`Promise`<`FlairCsvResult`[]>

- Array of statuses for each entry provided.

### submitComment()

submitComment(`options`): `Promise`<`Comment`>

Submit a new comment to a post or comment.

#### Parameters

##### options

`CommentSubmissionOptions` & `object`

You must provide either `options.text` or `options.richtext` but not both.

#### Returns

`Promise`<`Comment`>

A Promise that resolves to a Comment object.

#### Example

```
import { RunAs } from '@devvit/public-api';const comment = await reddit.submitComment({ id: 't1_1qgif', text: 'Hello world!', runAs: RunAs.APP,})
```

### submitPost()

submitPost(`options`): `Promise`<`Post`>

Submits a new post to a subreddit.

#### Parameters

##### options

`SubmitPostOptions`

Either a self post or a link post.

#### Returns

`Promise`<`Post`>

A Promise that resolves to a Post object.

#### Examples

```
const post = await reddit.submitPost({ subredditName: 'devvit', title: 'Hello World', richtext: new RichTextBuilder() .heading({ level: 1 }, (h) => { h.rawText('Hello world'); }) .codeBlock({}, (cb) => cb.rawText('This post was created via the Devvit API')) .build()});
```

By default, `submitPost()` creates a Post on behalf of the App account, but it may be called on behalf of the User making the request by setting the option `runAs: RunAs.USER`.
When using `runAs: RunAs.USER` to create an experience Post, you must specify the `userGeneratedContent` option. For example:

```
import { RunAs } from '@devvit/public-api';const post = await reddit.submitPost({ title: 'My Devvit Post', runAs: RunAs.USER, userGeneratedContent: { text: "hello there", imageUrls: ["https://styles.redditmedia.com/t5_5wa5ww/styles/communityIcon_wyopomb2xb0a1.png", "https://styles.redditmedia.com/t5_49fkib/styles/bannerBackgroundImage_5a4axis7cku61.png"] }, subredditName: await reddit.getCurrentSubredditName(), textFallback: { text: 'This is a Devvit post!', }, preview: ( Loading... ),});
```

### subscribeToCurrentSubreddit()

subscribeToCurrentSubreddit(): `Promise`<`void`>

Subscribes to the subreddit in which the app is installed. No-op if the user is already subscribed.
This method will execute as the app account by default.
To subscribe on behalf of a user, please contact Reddit.

#### Returns

`Promise`<`void`>

### unbanUser()

unbanUser(`username`, `subredditName`): `Promise`<`void`>

Unban a user from a subreddit.

#### Parameters

##### username

`string`

The username of the user to unban. e.g. 'spez'

##### subredditName

`string`

The name of the subreddit to unban the user from. e.g. 'memes'

#### Returns

`Promise`<`void`>

### unbanWikiContributor()

unbanWikiContributor(`username`, `subredditName`): `Promise`<`void`>

#### Parameters

##### username

`string`

The username of the user to unban. e.g. 'spez'

##### subredditName

`string`

The name of the subreddit to unban the user from contributing to the wiki on. e.g. 'memes'

#### Returns

`Promise`<`void`>

### unmuteUser()

unmuteUser(`username`, `subredditName`): `Promise`<`void`>

Unmute a user in a subreddit. Unmuting a user allows them to send modmail.

#### Parameters

##### username

`string`

The username of the user to unmute. e.g. 'spez'

##### subredditName

`string`

The name of the subreddit to unmute the user in. e.g. 'memes'

#### Returns

`Promise`<`void`>

### unsubscribeFromCurrentSubreddit()

unsubscribeFromCurrentSubreddit(): `Promise`<`void`>

Unsubscribes from the subreddit in which the app is installed. No-op if the user isn't subscribed.
This method will execute as the app account by default.
To unsubscribe on behalf of a user, please contact Reddit.

#### Returns

`Promise`<`void`>

### updateSubredditRemovalReason()

updateSubredditRemovalReason(`subredditName`, `reasonId`, `options`): `Promise`<`void`>

Update an existing removal reason in a subreddit.

#### Parameters

##### subredditName

`string`

Name of the subreddit (e.g. `askReddit` or `r/askReddit`).

##### reasonId

`string`

ID of the removal reason (from get or add).

##### options

###### message

`string`

The message associated with the removal reason.

###### title

`string`

The title of the removal reason.

#### Returns

`Promise`<`void`>

### updateWidget()

updateWidget(`widgetData`): `Promise`<`Widget`>

Update a widget for a subreddit.

#### Parameters

##### widgetData

`UpdateWidgetData`

The data for the widget to update.

#### Returns

`Promise`<`Widget`>

- The updated Widget object.

### updateWikiPage()

updateWikiPage(`options`): `Promise`<`WikiPage`>

Update a wiki page.

#### Parameters

##### options

`UpdateWikiPageOptions`

Options for the request

#### Returns

`Promise`<`WikiPage`>

The updated WikiPage object.

### updateWikiPageSettings()

updateWikiPageSettings(`options`): `Promise`<`WikiPageSettings`>

Update the settings for a wiki page.

#### Parameters

##### options

`UpdatePageSettingsOptions`

Options for the request

#### Returns

`Promise`<`WikiPageSettings`>

A WikiPageSettings object.


<!-- ============ /docs/api/redditapi/models/classes/Post ============ -->

> source: https://developers.reddit.com/docs/api/redditapi/models/classes/Post

- 
- Reddit API
- Classes
- Post

# Post
@devvit/public-api v0.12.23-dev

# Class: Post

## Accessors

### approved

#### Get Signature

get approved(): `boolean`

##### Returns

`boolean`

### approvedAtUtc

#### Get Signature

get approvedAtUtc(): `number`

##### Returns

`number`

### archived

#### Get Signature

get archived(): `boolean`

##### Returns

`boolean`

### authorFlair

#### Get Signature

get authorFlair(): `undefined` | `CommonFlair`

##### Returns

`undefined` | `CommonFlair`

### authorId

#### Get Signature

get authorId(): `undefined` | ``t2_${string}``

##### Returns

`undefined` | ``t2_${string}``

### authorName

#### Get Signature

get authorName(): `string`

##### Returns

`string`

### bannedAtUtc

#### Get Signature

get bannedAtUtc(): `number`

##### Returns

`number`

### body

#### Get Signature

get body(): `undefined` | `string`

##### Returns

`undefined` | `string`

### bodyHtml

#### Get Signature

get bodyHtml(): `undefined` | `string`

##### Returns

`undefined` | `string`

### comments

#### Get Signature

get comments(): `Listing`<`Comment`>

##### Returns

`Listing`<`Comment`>

### createdAt

#### Get Signature

get createdAt(): `Date`

##### Returns

`Date`

### distinguishedBy

#### Get Signature

get distinguishedBy(): `undefined` | `string`

##### Returns

`undefined` | `string`

### edited

#### Get Signature

get edited(): `boolean`

##### Returns

`boolean`

### flair

#### Get Signature

get flair(): `undefined` | `CommonFlair`

##### Returns

`undefined` | `CommonFlair`

### gallery

#### Get Signature

get gallery(): `GalleryMedia`[]

Get the media in the post. Empty if the post doesn't have any media.

##### Returns

`GalleryMedia`[]

### hidden

#### Get Signature

get hidden(): `boolean`

##### Returns

`boolean`

### id

#### Get Signature

get id(): ``t3_${string}``

##### Returns

``t3_${string}``

### ignoringReports

#### Get Signature

get ignoringReports(): `boolean`

##### Returns

`boolean`

### locked

#### Get Signature

get locked(): `boolean`

##### Returns

`boolean`

### modReportReasons

#### Get Signature

get modReportReasons(): `string`[]

##### Returns

`string`[]

### nsfw

#### Get Signature

get nsfw(): `boolean`

##### Returns

`boolean`

### numberOfComments

#### Get Signature

get numberOfComments(): `number`

##### Returns

`number`

### numberOfReports

#### Get Signature

get numberOfReports(): `number`

##### Returns

`number`

### permalink

#### Get Signature

get permalink(): `string`

##### Returns

`string`

### pollData

#### Get Signature

get pollData(): `undefined` | `PollData`

Poll data for the post, if the post is a poll. Undefined otherwise.

##### Returns

`undefined` | `PollData`

### quarantined

#### Get Signature

get quarantined(): `boolean`

##### Returns

`boolean`

### removed

#### Get Signature

get removed(): `boolean`

##### Returns

`boolean`

### removedBy

#### Get Signature

get removedBy(): `undefined` | `string`

Who removed this object (username)

##### Returns

`undefined` | `string`

### removedByCategory

#### Get Signature

get removedByCategory(): `undefined` | `string`

who/what removed this object. It will return one of the following:

- "anti_evil_ops": object is removed by a aeops member

- "author": object is removed by author of the post

- "automod_filtered": object is filtered by automod

- "community_ops": object is removed by a community team member

- "content_takedown": object is removed due to content violation

- "copyright_takedown": object is removed due to copyright violation

- "deleted": object is deleted

- "moderator": object is removed by a mod of the sub

- "reddit": object is removed by anyone else

- undefined: object is not removed

##### Returns

`undefined` | `string`

### score

#### Get Signature

get score(): `number`

##### Returns

`number`

### secureMedia

#### Get Signature

get secureMedia(): `undefined` | `SecureMedia`

##### Returns

`undefined` | `SecureMedia`

### spam

#### Get Signature

get spam(): `boolean`

##### Returns

`boolean`

### spoiler

#### Get Signature

get spoiler(): `boolean`

##### Returns

`boolean`

### stickied

#### Get Signature

get stickied(): `boolean`

##### Returns

`boolean`

### subredditId

#### Get Signature

get subredditId(): ``t5_${string}``

##### Returns

``t5_${string}``

### subredditName

#### Get Signature

get subredditName(): `string`

##### Returns

`string`

### thumbnail

#### Get Signature

get thumbnail(): `undefined` | { `height`: `number`; `url`: `string`; `width`: `number`; }

##### Returns

`undefined` | { `height`: `number`; `url`: `string`; `width`: `number`; }

### title

#### Get Signature

get title(): `string`

##### Returns

`string`

### url

#### Get Signature

get url(): `string`

##### Returns

`string`

### userReportReasons

#### Get Signature

get userReportReasons(): `string`[]

##### Returns

`string`[]

## Methods

### addComment()

addComment(`options`): `Promise`<`Comment`>

#### Parameters

##### options

`CommentSubmissionOptions`

#### Returns

`Promise`<`Comment`>

### addRemovalNote()

addRemovalNote(`options`): `Promise`<`void`>

Add a mod note for why the post was removed

#### Parameters

##### options

###### modNote?

`string`

the reason for removal (maximum 100 characters) (optional)

###### reasonId

`string`

id of a Removal Reason - you can leave this as an empty string if you don't have one

#### Returns

`Promise`<`void`>

### approve()

approve(): `Promise`<`void`>

#### Returns

`Promise`<`void`>

### crosspost()

crosspost(`options`): `Promise`<`Post`>

#### Parameters

##### options

`Omit`<`CrosspostOptions`, `"postId"`>

#### Returns

`Promise`<`Post`>

### delete()

delete(): `Promise`<`void`>

#### Returns

`Promise`<`void`>

### distinguish()

distinguish(): `Promise`<`void`>

#### Returns

`Promise`<`void`>

### distinguishAsAdmin()

distinguishAsAdmin(): `Promise`<`void`>

#### Returns

`Promise`<`void`>

### edit()

edit(`options`): `Promise`<`void`>

#### Parameters

##### options

`PostTextOptions`

#### Returns

`Promise`<`void`>

### getAuthor()

getAuthor(): `Promise`<`undefined` | `User`>

#### Returns

`Promise`<`undefined` | `User`>

### getCurrentUserPollOption()

getCurrentUserPollOption(): `Promise`<`undefined` | `PollOption`>

Get the poll option the authenticated user selected for this post.
Returns undefined if the post is not a poll or the user has not voted.

This method will get the poll option for the app account by default.
To get the poll option for a user, please contact Reddit.

#### Returns

`Promise`<`undefined` | `PollOption`>

### getDuplicates()

getDuplicates(`options`): `Listing`<`Post`>

#### Parameters

##### options

`Omit`<`GetDuplicatesOptions`, `"postId"`> = `{}`

#### Returns

`Listing`<`Post`>

### getEnrichedThumbnail()

getEnrichedThumbnail(): `Promise`<`undefined` | `EnrichedThumbnail`>

Get a thumbnail that contains a preview image and also contains a blurred preview for
NSFW images. The thumbnail returned has higher resolution than Post.thumbnail.
Returns undefined if the post doesn't have a thumbnail

#### Returns

`Promise`<`undefined` | `EnrichedThumbnail`>

#### Throws

Throws an error if the thumbnail could not be fetched

#### Example

```
// from a menu action, form, scheduler, trigger, custom post click event, etcconst post = await context.reddit.getPostById(context.postId);const enrichedThumbnail = await post.getEnrichedThumbnail();
```

### getPostData()

getPostData(): `Promise`<`undefined` | `JsonObject`>

Get the postData for the post.

#### Returns

`Promise`<`undefined` | `JsonObject`>

#### Example

```
const post = await context.reddit.getPostById(context.postId);const postData = await post.getPostData();
```

### hide()

hide(): `Promise`<`void`>

#### Returns

`Promise`<`void`>

### ignoreReports()

ignoreReports(): `Promise`<`void`>

#### Returns

`Promise`<`void`>

### isApproved()

isApproved(): `boolean`

#### Returns

`boolean`

### isArchived()

isArchived(): `boolean`

#### Returns

`boolean`

### isDistinguishedBy()

isDistinguishedBy(): `undefined` | `string`

#### Returns

`undefined` | `string`

### isEdited()

isEdited(): `boolean`

#### Returns

`boolean`

### isHidden()

isHidden(): `boolean`

#### Returns

`boolean`

### isIgnoringReports()

isIgnoringReports(): `boolean`

#### Returns

`boolean`

### isLocked()

isLocked(): `boolean`

#### Returns

`boolean`

### isNsfw()

isNsfw(): `boolean`

#### Returns

`boolean`

### isQuarantined()

isQuarantined(): `boolean`

#### Returns

`boolean`

### isRemoved()

isRemoved(): `boolean`

#### Returns

`boolean`

### isSpam()

isSpam(): `boolean`

#### Returns

`boolean`

### isSpoiler()

isSpoiler(): `boolean`

#### Returns

`boolean`

### isStickied()

isStickied(): `boolean`

#### Returns

`boolean`

### lock()

lock(): `Promise`<`void`>

#### Returns

`Promise`<`void`>

### markAsNsfw()

markAsNsfw(): `Promise`<`void`>

#### Returns

`Promise`<`void`>

### markAsSpoiler()

markAsSpoiler(): `Promise`<`void`>

#### Returns

`Promise`<`void`>

### remove()

remove(`isSpam`): `Promise`<`void`>

#### Parameters

##### isSpam

`boolean` = `false`

#### Returns

`Promise`<`void`>

### setCustomPostPreview()

setCustomPostPreview(`ui`): `Promise`<`void`>

Set a lightweight UI that shows while the custom post renders

#### Parameters

##### ui

`ComponentFunction`

A JSX component function that returns a simple ui to be rendered.

#### Returns

`Promise`<`void`>

#### Throws

Throws an error if the preview could not be set.

#### Example

```
const preview = ( An updated preview! );const post = await reddit.getPostById(context.postId);await post.setCustomPostPreview(() => preview);
```

### setPostData()

setPostData(`postData`): `Promise`<`void`>

Set the postData on a custom post.

#### Parameters

##### postData

`JsonObject`

Represents the postData to be set, eg: { currentScore: 55, secretWord: 'barbeque' }

#### Returns

`Promise`<`void`>

#### Throws

Throws an error if the postData could not be set.

#### Example

```
const post = await reddit.getPostById(context.postId);await post.setPostData({ currentScore: 55, secretWord: 'barbeque',});
```

### setSuggestedCommentSort()

setSuggestedCommentSort(`suggestedSort`): `Promise`<`void`>

Set the suggested sort for comments on a Post.

#### Parameters

##### suggestedSort

`PostSuggestedCommentSort`

#### Returns

`Promise`<`void`>

#### Throws

Throws an error if the suggested sort could not be set.

#### Example

```
const post = await reddit.getPostById(context.postId);await post.setSuggestedCommentSort("NEW");
```

### setTextFallback()

setTextFallback(`options`): `Promise`<`void`>

Set a text fallback for the custom post

#### Parameters

##### options

`CustomPostTextFallbackOptions`

A text or a richtext to render in a fallback

#### Returns

`Promise`<`void`>

#### Throws

Throws an error if the fallback could not be set.

#### Example

```
// from a menu action, form, scheduler, trigger, custom post click event, etcconst newTextFallback = { text: 'This is an updated text fallback' };const post = await context.reddit.getPostById(context.postId);await post.setTextFallback(newTextFallback);
```

### snoozeReports()

snoozeReports(`reason`): `Promise`<`void`>

Snooze subsequent reports with the given reason from the same users for the next 7 days.
Only works for free-form reports.

#### Parameters

##### reason

`string`

The report reason to snooze.

#### Returns

`Promise`<`void`>

### sticky()

sticky(`position`?): `Promise`<`void`>

#### Parameters

##### position?

`1` | `2` | `3` | `4`

#### Returns

`Promise`<`void`>

### toJSON()

toJSON(): `Pick`<`Post`, `"subredditName"` | `"flair"` | `"id"` | `"score"` | `"title"` | `"subredditId"` | `"url"` | `"createdAt"` | `"nsfw"` | `"permalink"` | `"authorId"` | `"authorName"` | `"body"` | `"bodyHtml"` | `"thumbnail"` | `"numberOfComments"` | `"numberOfReports"` | `"approved"` | `"spam"` | `"stickied"` | `"removed"` | `"removedBy"` | `"removedByCategory"` | `"archived"` | `"edited"` | `"locked"` | `"quarantined"` | `"spoiler"` | `"hidden"` | `"ignoringReports"` | `"distinguishedBy"` | `"authorFlair"` | `"secureMedia"` | `"userReportReasons"` | `"modReportReasons"`>

#### Returns

`Pick`<`Post`, `"subredditName"` | `"flair"` | `"id"` | `"score"` | `"title"` | `"subredditId"` | `"url"` | `"createdAt"` | `"nsfw"` | `"permalink"` | `"authorId"` | `"authorName"` | `"body"` | `"bodyHtml"` | `"thumbnail"` | `"numberOfComments"` | `"numberOfReports"` | `"approved"` | `"spam"` | `"stickied"` | `"removed"` | `"removedBy"` | `"removedByCategory"` | `"archived"` | `"edited"` | `"locked"` | `"quarantined"` | `"spoiler"` | `"hidden"` | `"ignoringReports"` | `"distinguishedBy"` | `"authorFlair"` | `"secureMedia"` | `"userReportReasons"` | `"modReportReasons"`>

### undistinguish()

undistinguish(): `Promise`<`void`>

#### Returns

`Promise`<`void`>

### unhide()

unhide(): `Promise`<`void`>

#### Returns

`Promise`<`void`>

### unignoreReports()

unignoreReports(): `Promise`<`void`>

#### Returns

`Promise`<`void`>

### unlock()

unlock(): `Promise`<`void`>

#### Returns

`Promise`<`void`>

### unmarkAsNsfw()

unmarkAsNsfw(): `Promise`<`void`>

#### Returns

`Promise`<`void`>

### unmarkAsSpoiler()

unmarkAsSpoiler(): `Promise`<`void`>

#### Returns

`Promise`<`void`>

### unsnoozeReports()

unsnoozeReports(`reason`): `Promise`<`void`>

Unsnooze reports with the given reason.
Only works for free-form reports.

#### Parameters

##### reason

`string`

The report reason to unsnooze.

#### Returns

`Promise`<`void`>

### unsticky()

unsticky(): `Promise`<`void`>

#### Returns

`Promise`<`void`>

### updateCrowdControlLevel()

updateCrowdControlLevel(`level`): `Promise`<`void`>

Updates the crowd control level of the post to hide comments accordingly.

#### Parameters

##### level

`CrowdControlLevel`

The crowd control level to set. See CrowdControlLevel for more information.

#### Returns

`Promise`<`void`>


<!-- ============ /docs/api/redditapi/models/classes/Comment ============ -->

> source: https://developers.reddit.com/docs/api/redditapi/models/classes/Comment

- 
- Reddit API
- Classes
- Comment

# Comment
@devvit/public-api v0.12.23-dev

# Class: Comment

## Accessors

### approved

#### Get Signature

get approved(): `boolean`

##### Returns

`boolean`

### approvedAtUtc

#### Get Signature

get approvedAtUtc(): `number`

A number representing the UTC timestamp in seconds, or 0 if its not approved.

##### Returns

`number`

### authorFlair

#### Get Signature

get authorFlair(): `undefined` | `CommonFlair`

##### Returns

`undefined` | `CommonFlair`

### authorId

#### Get Signature

get authorId(): `undefined` | ``t2_${string}``

##### Returns

`undefined` | ``t2_${string}``

### authorName

#### Get Signature

get authorName(): `string`

##### Returns

`string`

### bannedAtUtc

#### Get Signature

get bannedAtUtc(): `number`

##### Returns

`number`

### body

#### Get Signature

get body(): `string`

##### Returns

`string`

### collapsedBecauseCrowdControl

#### Get Signature

get collapsedBecauseCrowdControl(): `boolean`

##### Returns

`boolean`

### createdAt

#### Get Signature

get createdAt(): `Date`

##### Returns

`Date`

### distinguishedBy

#### Get Signature

get distinguishedBy(): `undefined` | `string`

##### Returns

`undefined` | `string`

### edited

#### Get Signature

get edited(): `boolean`

##### Returns

`boolean`

### id

#### Get Signature

get id(): ``t1_${string}``

##### Returns

``t1_${string}``

### ignoringReports

#### Get Signature

get ignoringReports(): `boolean`

##### Returns

`boolean`

### locked

#### Get Signature

get locked(): `boolean`

##### Returns

`boolean`

### modReportReasons

#### Get Signature

get modReportReasons(): `string`[]

##### Returns

`string`[]

### numReports

#### Get Signature

get numReports(): `number`

##### Returns

`number`

### parentId

#### Get Signature

get parentId(): ``t1_${string}`` | ``t3_${string}``

##### Returns

``t1_${string}`` | ``t3_${string}``

### permalink

#### Get Signature

get permalink(): `string`

##### Returns

`string`

### postId

#### Get Signature

get postId(): ``t3_${string}``

##### Returns

``t3_${string}``

### removed

#### Get Signature

get removed(): `boolean`

##### Returns

`boolean`

### replies

#### Get Signature

get replies(): `Listing`<`Comment`>

##### Returns

`Listing`<`Comment`>

### score

#### Get Signature

get score(): `number`

##### Returns

`number`

### spam

#### Get Signature

get spam(): `boolean`

##### Returns

`boolean`

### stickied

#### Get Signature

get stickied(): `boolean`

##### Returns

`boolean`

### subredditId

#### Get Signature

get subredditId(): ``t5_${string}``

##### Returns

``t5_${string}``

### subredditName

#### Get Signature

get subredditName(): `string`

##### Returns

`string`

### url

#### Get Signature

get url(): `string`

##### Returns

`string`

### userReportReasons

#### Get Signature

get userReportReasons(): `string`[]

##### Returns

`string`[]

## Methods

### addRemovalNote()

addRemovalNote(`options`): `Promise`<`void`>

Add a mod note for why the comment was removed

#### Parameters

##### options

###### modNote?

`string`

the reason for removal (maximum 100 characters) (optional)

###### reasonId

`string`

id of a Removal Reason - you can leave this as an empty string if you don't have one

#### Returns

`Promise`<`void`>

### approve()

approve(): `Promise`<`void`>

#### Returns

`Promise`<`void`>

### delete()

delete(): `Promise`<`void`>

#### Returns

`Promise`<`void`>

### distinguish()

distinguish(`makeSticky`): `Promise`<`void`>

#### Parameters

##### makeSticky

`boolean` = `false`

#### Returns

`Promise`<`void`>

### distinguishAsAdmin()

distinguishAsAdmin(`makeSticky`): `Promise`<`void`>

#### Parameters

##### makeSticky

`boolean` = `false`

#### Returns

`Promise`<`void`>

### edit()

edit(`options`): `Promise`<`Comment`>

#### Parameters

##### options

`CommentSubmissionOptions`

#### Returns

`Promise`<`Comment`>

### getAuthor()

getAuthor(): `Promise`<`undefined` | `User`>

#### Returns

`Promise`<`undefined` | `User`>

### ignoreReports()

ignoreReports(): `Promise`<`void`>

#### Returns

`Promise`<`void`>

### isApproved()

isApproved(): `boolean`

#### Returns

`boolean`

### isDistinguished()

isDistinguished(): `boolean`

#### Returns

`boolean`

### isEdited()

isEdited(): `boolean`

#### Returns

`boolean`

### isIgnoringReports()

isIgnoringReports(): `boolean`

#### Returns

`boolean`

### isLocked()

isLocked(): `boolean`

#### Returns

`boolean`

### isRemoved()

isRemoved(): `boolean`

#### Returns

`boolean`

### isSpam()

isSpam(): `boolean`

#### Returns

`boolean`

### isStickied()

isStickied(): `boolean`

#### Returns

`boolean`

### lock()

lock(): `Promise`<`void`>

#### Returns

`Promise`<`void`>

### remove()

remove(`isSpam`): `Promise`<`void`>

#### Parameters

##### isSpam

`boolean` = `false`

#### Returns

`Promise`<`void`>

### reply()

reply(`options`): `Promise`<`Comment`>

#### Parameters

##### options

`CommentSubmissionOptions`

#### Returns

`Promise`<`Comment`>

### showComment()

showComment(): `Promise`<`void`>

Marks that this comment should not be collapsed by the crowd control system.
It can still be collapsed for other reasons.

#### Returns

`Promise`<`void`>

### snoozeReports()

snoozeReports(`reason`): `Promise`<`void`>

Snooze subsequent reports with the given reason from the same users for the next 7 days.
Only works for free-form reports.

#### Parameters

##### reason

`string`

The report reason to snooze.

#### Returns

`Promise`<`void`>

### toJSON()

toJSON(): `Pick`<`Comment`, `"subredditName"` | `"id"` | `"score"` | `"subredditId"` | `"postId"` | `"url"` | `"createdAt"` | `"permalink"` | `"authorName"` | `"body"` | `"approved"` | `"spam"` | `"stickied"` | `"removed"` | `"edited"` | `"locked"` | `"ignoringReports"` | `"distinguishedBy"` | `"authorFlair"` | `"userReportReasons"` | `"modReportReasons"` | `"parentId"` | `"replies"` | `"numReports"` | `"collapsedBecauseCrowdControl"`>

#### Returns

`Pick`<`Comment`, `"subredditName"` | `"id"` | `"score"` | `"subredditId"` | `"postId"` | `"url"` | `"createdAt"` | `"permalink"` | `"authorName"` | `"body"` | `"approved"` | `"spam"` | `"stickied"` | `"removed"` | `"edited"` | `"locked"` | `"ignoringReports"` | `"distinguishedBy"` | `"authorFlair"` | `"userReportReasons"` | `"modReportReasons"` | `"parentId"` | `"replies"` | `"numReports"` | `"collapsedBecauseCrowdControl"`>

### undistinguish()

undistinguish(): `Promise`<`void`>

#### Returns

`Promise`<`void`>

### unignoreReports()

unignoreReports(): `Promise`<`void`>

#### Returns

`Promise`<`void`>

### unlock()

unlock(): `Promise`<`void`>

#### Returns

`Promise`<`void`>

### unsnoozeReports()

unsnoozeReports(`reason`): `Promise`<`void`>

Unsnooze reports with the given reason.
Only works for free-form reports.

#### Parameters

##### reason

`string`

The report reason to unsnooze.

#### Returns

`Promise`<`void`>


<!-- ============ /docs/api/redditapi/models/classes/Subreddit ============ -->

> source: https://developers.reddit.com/docs/api/redditapi/models/classes/Subreddit

- 
- Reddit API
- Classes
- Subreddit

# Subreddit
@devvit/public-api v0.12.23-dev

# Class: Subreddit

A class representing a subreddit.

## Accessors

### createdAt

#### Get Signature

get createdAt(): `Date`

The creation date of the subreddit.

##### Returns

`Date`

### description

#### Get Signature

get description(): `undefined` | `string`

The description of the subreddit.

##### Returns

`undefined` | `string`

### id

#### Get Signature

get id(): ``t5_${string}``

The ID (starting with t5_) of the subreddit to retrieve. e.g. t5_2qjpg

##### Returns

``t5_${string}``

### language

#### Get Signature

get language(): `string`

The language of the subreddit.

##### Returns

`string`

### name

#### Get Signature

get name(): `string`

The name of a subreddit omitting the r/.

##### Returns

`string`

### nsfw

#### Get Signature

get nsfw(): `boolean`

Whether the subreddit is marked as NSFW (Not Safe For Work).

##### Returns

`boolean`

### numberOfActiveUsers

#### Get Signature

get numberOfActiveUsers(): `number`

The number of active users of the subreddit.

##### Returns

`number`

### numberOfSubscribers

#### Get Signature

get numberOfSubscribers(): `number`

The number of subscribers of the subreddit.

##### Returns

`number`

### permalink

#### Get Signature

get permalink(): `string`

Returns a permalink path
(R2 bug: subreddit.url is a permalink, and does not have a subreddit.permalink field)

##### Returns

`string`

### postFlairsEnabled

#### Get Signature

get postFlairsEnabled(): `boolean`

Whether the post flairs are enabled for this subreddit.

##### Returns

`boolean`

### settings

#### Get Signature

get settings(): `SubredditSettings`

The settings of the subreddit.

##### Returns

`SubredditSettings`

### title

#### Get Signature

get title(): `undefined` | `string`

The title of the subreddit.

##### Returns

`undefined` | `string`

### type

#### Get Signature

get type(): `SubredditType`

The type of subreddit (public, private, etc.).

##### Returns

`SubredditType`

### url

#### Get Signature

get url(): `string`

Returns the HTTP URL for the subreddit.
(R2 bug: subreddit.url is a permalink path and does not return a fully qualified URL in subreddit.url)

##### Returns

`string`

### userFlairsEnabled

#### Get Signature

get userFlairsEnabled(): `boolean`

Whether the user flairs are enabled for this subreddit.

##### Returns

`boolean`

### usersCanAssignPostFlairs

#### Get Signature

get usersCanAssignPostFlairs(): `boolean`

Whether the user can assign post flairs.
This is only true if the post flairs are enabled.

##### Returns

`boolean`

### usersCanAssignUserFlairs

#### Get Signature

get usersCanAssignUserFlairs(): `boolean`

Whether the user can assign user flairs.
This is only true if the user flairs are enabled.

##### Returns

`boolean`

## Methods

### addRemovalReason()

addRemovalReason(`options`): `Promise`<`string`>

Add a removal reason to this subreddit.

#### Parameters

##### options

###### message

`string`

The message associated with the removal reason.

###### title

`string`

The title of the removal reason.

#### Returns

`Promise`<`string`>

The new removal reason ID.

### addWikiContributor()

addWikiContributor(`username`): `Promise`<`void`>

#### Parameters

##### username

`string`

#### Returns

`Promise`<`void`>

### approveUser()

approveUser(`username`): `Promise`<`void`>

#### Parameters

##### username

`string`

#### Returns

`Promise`<`void`>

### banUser()

banUser(`options`): `Promise`<`void`>

#### Parameters

##### options

`Omit`<`BanUserOptions`, `"subredditName"`>

#### Returns

`Promise`<`void`>

### banWikiContributor()

banWikiContributor(`options`): `Promise`<`void`>

#### Parameters

##### options

`Omit`<`BanWikiContributorOptions`, `"subredditName"`>

#### Returns

`Promise`<`void`>

### createPostFlairTemplate()

createPostFlairTemplate(`options`): `Promise`<`FlairTemplate`>

#### Parameters

##### options

`Omit`<`CreateFlairTemplateOptions`, `"subredditName"`>

#### Returns

`Promise`<`FlairTemplate`>

### createRule()

createRule(`options`): `Promise`<`void`>

Create a new subreddit rule.

#### Parameters

##### options

`Readonly`<`CreateRuleOptions`>

Options for creating a new subreddit rule.

#### Returns

`Promise`<`void`>

### createUserFlairTemplate()

createUserFlairTemplate(`options`): `Promise`<`FlairTemplate`>

#### Parameters

##### options

`Omit`<`CreateFlairTemplateOptions`, `"subredditName"`>

#### Returns

`Promise`<`FlairTemplate`>

### deleteRemovalReason()

deleteRemovalReason(`reasonId`): `Promise`<`void`>

Delete a removal reason from this subreddit.

#### Parameters

##### reasonId

`string`

#### Returns

`Promise`<`void`>

### getApprovedUsers()

getApprovedUsers(`options`): `Listing`<`User`>

#### Parameters

##### options

`GetUsersOptions` = `{}`

#### Returns

`Listing`<`User`>

### getBannedUsers()

getBannedUsers(`options`): `Listing`<`User`>

#### Parameters

##### options

`GetUsersOptions` = `{}`

#### Returns

`Listing`<`User`>

### getBannedWikiContributors()

getBannedWikiContributors(`options`): `Listing`<`User`>

#### Parameters

##### options

`GetUsersOptions` = `{}`

#### Returns

`Listing`<`User`>

### getCommentsAndPostsByIds()

getCommentsAndPostsByIds(`ids`): `Listing`<`Post` | `Comment`>

Return a listing of things specified by their fullnames.

#### Parameters

##### ids

`string`[]

Array of thing full ids (e.g. t3_abc123)

#### Returns

`Listing`<`Post` | `Comment`>

#### Example

```
const subreddit = await reddit.getSubredditByName('askReddit');const listing = subreddit.getCommentsAndPostsByIds(['t3_abc123', 't1_xyz123']);const items = await listing.all();console.log(items) // [Post, Comment]
```

### getControversialPosts()

getControversialPosts(`options`): `Listing`<`Post`>

#### Parameters

##### options

`Omit`<`GetPostsOptionsWithTimeframe`, `"subredditName"`> = `{}`

#### Returns

`Listing`<`Post`>

### getEdited()

#### Call Signature

getEdited(`options`): `Listing`<`Comment`>

Return a listing of things that have been edited recently.

##### Parameters

###### options

`AboutSubredditOptions`<`"comment"`>

##### Returns

`Listing`<`Comment`>

##### Example

```
const subreddit = await reddit.getSubredditByName("mysubreddit")let listing = await subreddit.getEdited();console.log("Posts and Comments: ", await listing.all())listing = await subreddit.getEdited({ type: "post"});console.log("Posts: ", await listing.all())
```

#### Call Signature

getEdited(`options`): `Listing`<`Post`>

Return a listing of things that have been edited recently.

##### Parameters

###### options

`AboutSubredditOptions`<`"post"`>

##### Returns

`Listing`<`Post`>

##### Example

```
const subreddit = await reddit.getSubredditByName("mysubreddit")let listing = await subreddit.getEdited();console.log("Posts and Comments: ", await listing.all())listing = await subreddit.getEdited({ type: "post"});console.log("Posts: ", await listing.all())
```

#### Call Signature

getEdited(`options`?): `Listing`<`Post` | `Comment`>

Return a listing of things that have been edited recently.

##### Parameters

###### options?

`AboutSubredditOptions`<`"all"`>

##### Returns

`Listing`<`Post` | `Comment`>

##### Example

```
const subreddit = await reddit.getSubredditByName("mysubreddit")let listing = await subreddit.getEdited();console.log("Posts and Comments: ", await listing.all())listing = await subreddit.getEdited({ type: "post"});console.log("Posts: ", await listing.all())
```

### getModerationLog()

getModerationLog(`options`): `Listing`<`ModAction`>

#### Parameters

##### options

`GetModerationLogOptions`

#### Returns

`Listing`<`ModAction`>

### getModerators()

getModerators(`options`): `Listing`<`User`>

#### Parameters

##### options

`GetUsersOptions` = `{}`

#### Returns

`Listing`<`User`>

### getModQueue()

#### Call Signature

getModQueue(`options`): `Listing`<`Comment`>

Return a listing of things requiring moderator review, such as reported things and items.

##### Parameters

###### options

`AboutSubredditOptions`<`"comment"`>

##### Returns

`Listing`<`Comment`>

##### Example

```
const subreddit = await reddit.getSubredditByName("mysubreddit")let listing = await subreddit.getModQueue();console.log("Posts and Comments: ", await listing.all())listing = await subreddit.getModQueue({ type: "post"});console.log("Posts: ", await listing.all())
```

#### Call Signature

getModQueue(`options`): `Listing`<`Post`>

Return a listing of things requiring moderator review, such as reported things and items.

##### Parameters

###### options

`AboutSubredditOptions`<`"post"`>

##### Returns

`Listing`<`Post`>

##### Example

```
const subreddit = await reddit.getSubredditByName("mysubreddit")let listing = await subreddit.getModQueue();console.log("Posts and Comments: ", await listing.all())listing = await subreddit.getModQueue({ type: "post"});console.log("Posts: ", await listing.all())
```

#### Call Signature

getModQueue(`options`?): `Listing`<`Post` | `Comment`>

Return a listing of things requiring moderator review, such as reported things and items.

##### Parameters

###### options?

`AboutSubredditOptions`<`"all"`>

##### Returns

`Listing`<`Post` | `Comment`>

##### Example

```
const subreddit = await reddit.getSubredditByName("mysubreddit")let listing = await subreddit.getModQueue();console.log("Posts and Comments: ", await listing.all())listing = await subreddit.getModQueue({ type: "post"});console.log("Posts: ", await listing.all())
```

### getMutedUsers()

getMutedUsers(`options`): `Listing`<`User`>

#### Parameters

##### options

`GetUsersOptions` = `{}`

#### Returns

`Listing`<`User`>

### getPostFlairTemplates()

getPostFlairTemplates(): `Promise`<`FlairTemplate`[]>

#### Returns

`Promise`<`FlairTemplate`[]>

### getRemovalReasons()

getRemovalReasons(): `Promise`<`RemovalReason`[]>

Get the list of this subreddit's removal reasons (ordered).

#### Returns

`Promise`<`RemovalReason`[]>

### getReports()

#### Call Signature

getReports(`options`): `Listing`<`Comment`>

Return a listing of things that have been reported.

##### Parameters

###### options

`AboutSubredditOptions`<`"comment"`>

##### Returns

`Listing`<`Comment`>

##### Example

```
const subreddit = await reddit.getSubredditByName("mysubreddit")let listing = await subreddit.getReports();console.log("Posts and Comments: ", await listing.all())listing = await subreddit.getReports({ type: "post"});console.log("Posts: ", await listing.all())
```

#### Call Signature

getReports(`options`): `Listing`<`Post`>

Return a listing of things that have been reported.

##### Parameters

###### options

`AboutSubredditOptions`<`"post"`>

##### Returns

`Listing`<`Post`>

##### Example

```
const subreddit = await reddit.getSubredditByName("mysubreddit")let listing = await subreddit.getReports();console.log("Posts and Comments: ", await listing.all())listing = await subreddit.getReports({ type: "post"});console.log("Posts: ", await listing.all())
```

#### Call Signature

getReports(`options`?): `Listing`<`Post` | `Comment`>

Return a listing of things that have been reported.

##### Parameters

###### options?

`AboutSubredditOptions`<`"all"`>

##### Returns

`Listing`<`Post` | `Comment`>

##### Example

```
const subreddit = await reddit.getSubredditByName("mysubreddit")let listing = await subreddit.getReports();console.log("Posts and Comments: ", await listing.all())listing = await subreddit.getReports({ type: "post"});console.log("Posts: ", await listing.all())
```

### getRules()

getRules(): `Promise`<`Rule`[]>

#### Returns

`Promise`<`Rule`[]>

### getSpam()

#### Call Signature

getSpam(`options`): `Listing`<`Comment`>

Return a listing of things that have been marked as spam or otherwise removed.

##### Parameters

###### options

`AboutSubredditOptions`<`"comment"`>

##### Returns

`Listing`<`Comment`>

##### Example

```
const subreddit = await reddit.getSubredditByName("mysubreddit")let listing = await subreddit.getSpam();console.log("Posts and Comments: ", await listing.all())listing = await subreddit.getSpam({ type: "post"});console.log("Posts: ", await listing.all())
```

#### Call Signature

getSpam(`options`): `Listing`<`Post`>

Return a listing of things that have been marked as spam or otherwise removed.

##### Parameters

###### options

`AboutSubredditOptions`<`"post"`>

##### Returns

`Listing`<`Post`>

##### Example

```
const subreddit = await reddit.getSubredditByName("mysubreddit")let listing = await subreddit.getSpam();console.log("Posts and Comments: ", await listing.all())listing = await subreddit.getSpam({ type: "post"});console.log("Posts: ", await listing.all())
```

#### Call Signature

getSpam(`options`?): `Listing`<`Post` | `Comment`>

Return a listing of things that have been marked as spam or otherwise removed.

##### Parameters

###### options?

`AboutSubredditOptions`<`"all"`>

##### Returns

`Listing`<`Post` | `Comment`>

##### Example

```
const subreddit = await reddit.getSubredditByName("mysubreddit")let listing = await subreddit.getSpam();console.log("Posts and Comments: ", await listing.all())listing = await subreddit.getSpam({ type: "post"});console.log("Posts: ", await listing.all())
```

### getTopPosts()

getTopPosts(`options`): `Listing`<`Post`>

#### Parameters

##### options

`Omit`<`GetPostsOptionsWithTimeframe`, `"subredditName"`> = `{}`

#### Returns

`Listing`<`Post`>

### getUnmoderated()

#### Call Signature

getUnmoderated(`options`): `Listing`<`Comment`>

Return a listing of things that have yet to be approved/removed by a mod.

##### Parameters

###### options

`AboutSubredditOptions`<`"comment"`>

##### Returns

`Listing`<`Comment`>

##### Example

```
const subreddit = await reddit.getSubredditByName("mysubreddit")let listing = await subreddit.getUnmoderated();console.log("Posts and Comments: ", await listing.all())listing = await subreddit.getUnmoderated({ type: "post"});console.log("Posts: ", await listing.all())
```

#### Call Signature

getUnmoderated(`options`): `Listing`<`Post`>

Return a listing of things that have yet to be approved/removed by a mod.

##### Parameters

###### options

`AboutSubredditOptions`<`"post"`>

##### Returns

`Listing`<`Post`>

##### Example

```
const subreddit = await reddit.getSubredditByName("mysubreddit")let listing = await subreddit.getUnmoderated();console.log("Posts and Comments: ", await listing.all())listing = await subreddit.getUnmoderated({ type: "post"});console.log("Posts: ", await listing.all())
```

#### Call Signature

getUnmoderated(`options`?): `Listing`<`Post` | `Comment`>

Return a listing of things that have yet to be approved/removed by a mod.

##### Parameters

###### options?

`AboutSubredditOptions`<`"all"`>

##### Returns

`Listing`<`Post` | `Comment`>

##### Example

```
const subreddit = await reddit.getSubredditByName("mysubreddit")let listing = await subreddit.getUnmoderated();console.log("Posts and Comments: ", await listing.all())listing = await subreddit.getUnmoderated({ type: "post"});console.log("Posts: ", await listing.all())
```

### getUserFlair()

getUserFlair(`options`?): `Promise`<`GetUserFlairBySubredditResponse`>

Get the user flair for the given subreddit. If `usernames` is provided then it will return only the
flair for the specified users. If retrieving the list of flair for a given subreddit and the list is long
then this method will return a `next` field which can be passed into the `after` field on the next call to
retrieve the next slice of data. To retrieve the previous slice of data pass the `prev` field into the `before` field
during the subsequent call.

#### Parameters

##### options?

`GetUserFlairOptions`

See interface

#### Returns

`Promise`<`GetUserFlairBySubredditResponse`>

#### Examples

```
const subredditName = "mysubreddit"const subreddit = await reddit.getSubredditByName(subredditName)const response = await subreddit.getUserFlair();const userFlairList = response.users
```

```
const response = await subreddit.getUserFlair({ after: "t2_awefae"});const userFlairList = response.users
```

```
const response = await subreddit.getUserFlair({ usernames: ['toxictoad', 'badapple']});const userFlairList = response.users
```

### getUserFlairTemplates()

getUserFlairTemplates(): `Promise`<`FlairTemplate`[]>

#### Returns

`Promise`<`FlairTemplate`[]>

### getWikiContributors()

getWikiContributors(`options`): `Listing`<`User`>

#### Parameters

##### options

`GetUsersOptions` = `{}`

#### Returns

`Listing`<`User`>

### inviteModerator()

inviteModerator(`username`, `permissions`?): `Promise`<`void`>

#### Parameters

##### username

`string`

##### permissions?

`ModeratorPermission`[]

#### Returns

`Promise`<`void`>

### muteUser()

muteUser(`username`, `note`?): `Promise`<`void`>

#### Parameters

##### username

`string`

##### note?

`string`

#### Returns

`Promise`<`void`>

### removeModerator()

removeModerator(`username`): `Promise`<`void`>

#### Parameters

##### username

`string`

#### Returns

`Promise`<`void`>

### removeUser()

removeUser(`username`): `Promise`<`void`>

#### Parameters

##### username

`string`

#### Returns

`Promise`<`void`>

### removeWikiContributor()

removeWikiContributor(`username`): `Promise`<`void`>

#### Parameters

##### username

`string`

#### Returns

`Promise`<`void`>

### reorderRules()

reorderRules(`rules`): `Promise`<`void`>

#### Parameters

##### rules

`Rule`[]

#### Returns

`Promise`<`void`>

### revokeModeratorInvite()

revokeModeratorInvite(`username`): `Promise`<`void`>

#### Parameters

##### username

`string`

#### Returns

`Promise`<`void`>

### setModeratorPermissions()

setModeratorPermissions(`username`, `permissions`): `Promise`<`void`>

#### Parameters

##### username

`string`

##### permissions

`ModeratorPermission`[]

#### Returns

`Promise`<`void`>

### submitPost()

submitPost(`options`): `Promise`<`Post`>

#### Parameters

##### options

`SubmitLinkOptions` | `SubmitSelfPostOptions`

#### Returns

`Promise`<`Post`>

### toJSON()

toJSON(): `Pick`<`Subreddit`, `"type"` | `"description"` | `"id"` | `"name"` | `"title"` | `"settings"` | `"createdAt"` | `"language"` | `"numberOfSubscribers"` | `"numberOfActiveUsers"` | `"nsfw"`>

#### Returns

`Pick`<`Subreddit`, `"type"` | `"description"` | `"id"` | `"name"` | `"title"` | `"settings"` | `"createdAt"` | `"language"` | `"numberOfSubscribers"` | `"numberOfActiveUsers"` | `"nsfw"`>

### unbanUser()

unbanUser(`username`): `Promise`<`void`>

#### Parameters

##### username

`string`

#### Returns

`Promise`<`void`>

### unbanWikiContributor()

unbanWikiContributor(`username`): `Promise`<`void`>

#### Parameters

##### username

`string`

#### Returns

`Promise`<`void`>

### unmuteUser()

unmuteUser(`username`): `Promise`<`void`>

#### Parameters

##### username

`string`

#### Returns

`Promise`<`void`>

### updateRemovalReason()

updateRemovalReason(`reasonId`, `options`): `Promise`<`void`>

Update a removal reason's title and message in this subreddit.

#### Parameters

##### reasonId

`string`

##### options

###### message

`string`

###### title

`string`

#### Returns

`Promise`<`void`>

### updateSettings()

updateSettings(`options`): `Promise`<`void`>

Updates subreddit settings via the SiteAdmin API. Current settings are used as the base;
only provided options are applied. In order to reset a field to its default value,
pass the default value as the option value.

#### Parameters

##### options

`SubredditSettingsOptions`

Optional settings to apply. Omitted fields are left unchanged.

#### Returns

`Promise`<`void`>

#### Example

```
const subreddit = await reddit.getSubredditByName('mysubreddit');await subreddit.updateSettings({ restrictPosting: true, allowImages: false });await subreddit.updateSettings({ type: 'restricted', title: 'New Title', description: 'Sidebar text' });
```


<!-- ============ /docs/api/redditapi/models/classes/ModMailService ============ -->

> source: https://developers.reddit.com/docs/api/redditapi/models/classes/ModMailService

- 
- Reddit API
- Classes
- ModMailService

# ModMailService
@devvit/public-api v0.12.23-dev

# Class: ModMailService

Class providing the methods for working with Mod Mail

## Properties

### notificationSubjectPrefix

`readonly` notificationSubjectPrefix: `"[notification]"` = `'[notification]'`

## Methods

### approveConversation()

approveConversation(`conversationId`): `Promise`<`ConversationResponse` & `WithUserData`>

Approve the non mod user associated with a particular conversation.

#### Parameters

##### conversationId

`string`

Id of a modmail conversation

#### Returns

`Promise`<`ConversationResponse` & `WithUserData`>

#### Example

```
await reddit.modMail.approveConversation('abcdef');
```

### archiveConversation()

archiveConversation(`conversationId`): `Promise`<`ConversationResponse`>

Marks a conversation as archived

#### Parameters

##### conversationId

`string`

Id of a modmail conversation

#### Returns

`Promise`<`ConversationResponse`>

#### Example

```
await reddit.modMail.archive('abcdef');
```

### bulkReadConversations()

bulkReadConversations(`subreddits`, `state`): `Promise`<`string`[]>

Marks all conversations read for a particular conversation state within the passed list of subreddits.

#### Parameters

##### subreddits

`string`[]

Array of subreddit names

##### state

`ConversationStateFilter`

One of the possible conversation states ('all' to read all conversations)

#### Returns

`Promise`<`string`[]>

conversationIds

#### Example

```
const conversationIds = await reddit.modMail.bulkReadConversations( ['askReddit', 'myAwesomeSubreddit'], 'filtered');
```

### createConversation()

createConversation(`params`): `Promise`<`ConversationResponse` & `WithUserData`>

Creates a new conversation for a particular SR.

This endpoint will create a ModmailConversation object
as well as the first ModmailMessage within the ModmailConversation object.

#### Parameters

##### params

###### body

`string`

markdown text

###### isAuthorHidden?

`boolean`

is author hidden? (default: false)

###### subject

`string`

subject of the conversation. max 100 characters

###### subredditName

`string`

subreddit name

###### to?

`null` | `string`

a user (e.g. u/username), a subreddit (e.g. r/subreddit) or null

#### Returns

`Promise`<`ConversationResponse` & `WithUserData`>

#### Note

Note on {param.to}:
The to field for this endpoint is somewhat confusing. It can be:

- A User, passed like "username" or "u/username"

- A Subreddit, passed like "r/subreddit"

- null, meaning an internal moderator discussion

In this way to is a bit of a misnomer in modmail conversations.
What it really means is the participant of the conversation who is not a mod of the subreddit.

If you plan to send a message to the app-account or a moderator of the subreddit, use ModMailService.createModDiscussionConversation, ModMailService.createModInboxConversation, or ModMailService.createModNotification instead.
Otherwise, messages sent to the app-account or moderator will automatically be routed to Mod Discussions.

#### Example

```
const { conversation, messages, modActions } = await reddit.modMail.createConversation({ subredditName: 'askReddit', subject: 'Test conversation', body: 'Lorem ipsum sit amet', to: null,});
```

### createModDiscussionConversation()

createModDiscussionConversation(`params`): `Promise`<`string`>

Creates a conversation in Mod Discussions with the moderators of the given subredditId.

Note: The app must be installed in the subreddit in order to create a conversation in Mod Discussions.

#### Parameters

##### params

###### bodyMarkdown

`string`

###### subject

`string`

###### subredditId

`string`

#### Returns

`Promise`<`string`>

A Promise that resolves a string representing the conversationId of the message.

#### Example

```
const conversationId = await reddit.modMail.createModDiscussionConversation({ subject: 'Test conversation', bodyMarkdown: '**Hello there** \n\n _Have a great day!_', subredditId: context.subredditId});
```

### createModInboxConversation()

createModInboxConversation(`params`): `Promise`<`string`>

Creates a conversation in the Modmail Inbox with the moderators of the given subredditId.

#### Parameters

##### params

###### bodyMarkdown

`string`

###### subject

`string`

###### subredditId

`string`

#### Returns

`Promise`<`string`>

A Promise that resolves a string representing the conversationId of the message.

#### Example

```
const conversationId = await reddit.modMail.createModInboxConversation({ subject: 'Test conversation', bodyMarkdown: '**Hello there** \n\n _Have a great day!_', subredditId: context.subredditId});
```

### createModNotification()

createModNotification(`params`): `Promise`<`string`>

Creates a notification in the Modmail Inbox.
This function is different from ModMailService.createModInboxConversation in that the conversation also appears in the "Notifications" section of Modmail.

#### Parameters

##### params

###### bodyMarkdown

`string`

###### subject

`string`

###### subredditId

`string`

#### Returns

`Promise`<`string`>

A Promise that resolves a string representing the conversationId of the message.

#### Example

```
const conversationId = await reddit.modMail.createModNotification({ subject: 'Test notification', bodyMarkdown: '**Hello there** \n\n _This is a notification!_', subredditId: context.subredditId});
```

### disapproveConversation()

disapproveConversation(`conversationId`): `Promise`<`ConversationResponse` & `WithUserData`>

Disapprove the non mod user associated with a particular conversation.

#### Parameters

##### conversationId

`string`

Id of a modmail conversation

#### Returns

`Promise`<`ConversationResponse` & `WithUserData`>

#### Example

```
await reddit.modMail.disapproveConversation('abcdef');
```

### getConversation()

getConversation(`params`): `Promise`<`GetConversationResponse`>

Returns all messages, mod actions and conversation metadata for a given conversation id

#### Parameters

##### params

###### conversationId

`string`

a modmail conversation id

###### markRead?

`boolean`

mark read?

#### Returns

`Promise`<`GetConversationResponse`>

#### Example

```
const { conversation, messages, modActions, user } = await reddit.modMail.getConversation({ conversationId: 'abcdef', markRead: true });
```

### getConversations()

getConversations(`params`): `Promise`<`GetConversationsResponse`>

Get conversations for a logged in user or subreddits

#### Parameters

##### params

`GetConversationsRequest`

#### Returns

`Promise`<`GetConversationsResponse`>

#### Example

```
const {viewerId, conversations} = await reddit.modMail.getConversations({ after: 'abcdef', limit: 42});const arrayOfConversations = Object.values(conversations);
```

### getSubreddits()

getSubreddits(): `Promise`<{}>

Returns a list of Subreddits that the user moderates with mail permission

#### Returns

`Promise`<{}>

#### Example

```
const subredditsData = await reddit.modMail.getSubreddits();for (const subreddit of Object.values(subreddits)) { console.log(subreddit.id); console.log(subreddit.name);}
```

### getUnreadCount()

getUnreadCount(): `Promise`<`UnreadCountResponse`>

Endpoint to retrieve the unread conversation count by conversation state.

#### Returns

`Promise`<`UnreadCountResponse`>

#### Example

```
const response = await reddit.modMail.getUnreadCount();console.log(response.highlighted);console.log(response.new);
```

### getUserConversations()

getUserConversations(`conversationId`): `Promise`<`ConversationUserData`>

Returns recent posts, comments and modmail conversations for a given user.

#### Parameters

##### conversationId

`string`

Id of a modmail conversation

#### Returns

`Promise`<`ConversationUserData`>

#### Example

```
const data = await reddit.modMail.getUserConversations('abcdef');console.log(data.recentComments);console.log(data.recentPosts);
```

### highlightConversation()

highlightConversation(`conversationId`): `Promise`<`ConversationResponse`>

Marks a conversation as highlighted.

#### Parameters

##### conversationId

`string`

Id of a modmail conversation

#### Returns

`Promise`<`ConversationResponse`>

#### Example

```
await reddit.modMail.highlightConversation('abcdef');
```

### muteConversation()

muteConversation(`params`): `Promise`<`ConversationResponse` & `WithUserData`>

Marks a conversation as read for the user.

#### Parameters

##### params

###### conversationId

`string`

Id of a modmail conversation

###### numHours

`72` | `168` | `672`

For how many hours the conversation needs to be muted. Must be one of 72, 168, or 672 hours

#### Returns

`Promise`<`ConversationResponse` & `WithUserData`>

#### Example

```
await reddit.modMail.muteConversation({ conversationId: 'abcdef', numHours: 72 });
```

### readConversations()

readConversations(`conversationIds`): `Promise`<`void`>

Marks a conversations as read for the user.

#### Parameters

##### conversationIds

`string`[]

An array of ids

#### Returns

`Promise`<`void`>

#### Example

```
await reddit.modMail.readConversations(['abcdef', 'qwerty']);
```

### reply()

reply(`params`): `Promise`<`ConversationResponse` & `WithUserData`>

Creates a new message for a particular conversation.

#### Parameters

##### params

###### body

`string`

markdown text

###### conversationId

`string`

Id of a modmail conversation

###### isAuthorHidden?

`boolean`

is author hidden? (default: false)

###### isInternal?

`boolean`

is internal message? (default: false)

#### Returns

`Promise`<`ConversationResponse` & `WithUserData`>

#### Example

```
await reddit.modMail.reply({ body: 'Lorem ipsum sit amet', conversationId: 'abcdef',});
```

### tempBanConversation()

tempBanConversation(`params`): `Promise`<`ConversationResponse` & `WithUserData`>

Temporary ban (switch from permanent to temporary ban) the non mod user associated with a particular conversation.

#### Parameters

##### params

###### conversationId

`string`

a modmail conversation id

###### duration

`number`

duration in days, max 999

#### Returns

`Promise`<`ConversationResponse` & `WithUserData`>

#### Example

```
await reddit.modMail.tempBanConversation({ conversationId: 'abcdef', duration: 42 });
```

### unarchiveConversation()

unarchiveConversation(`conversationId`): `Promise`<`ConversationResponse`>

Marks conversation as unarchived.

#### Parameters

##### conversationId

`string`

Id of a modmail conversation

#### Returns

`Promise`<`ConversationResponse`>

#### Example

```
await reddit.modMail.unarchiveConversation('abcdef');
```

### unbanConversation()

unbanConversation(`conversationId`): `Promise`<`ConversationResponse` & `WithUserData`>

Unban the non mod user associated with a particular conversation.

#### Parameters

##### conversationId

`string`

a modmail conversation id

#### Returns

`Promise`<`ConversationResponse` & `WithUserData`>

#### Example

```
await reddit.modMail.unbanConversation('abcdef');
```

### unhighlightConversation()

unhighlightConversation(`conversationId`): `Promise`<`ConversationResponse`>

Removes a highlight from a conversation.

#### Parameters

##### conversationId

`string`

Id of a modmail conversation

#### Returns

`Promise`<`ConversationResponse`>

#### Example

```
await reddit.modMail.unhighlightConversation('abcdef');
```

### unmuteConversation()

unmuteConversation(`conversationId`): `Promise`<`ConversationResponse` & `WithUserData`>

Unmutes the non mod user associated with a particular conversation.

#### Parameters

##### conversationId

`string`

Id of a modmail conversation

#### Returns

`Promise`<`ConversationResponse` & `WithUserData`>

#### Example

```
await reddit.modMail.unmuteConversation('abcdef');
```

### unreadConversations()

unreadConversations(`conversationIds`): `Promise`<`void`>

Marks conversations as unread for the user.

#### Parameters

##### conversationIds

`string`[]

An array of ids

#### Returns

`Promise`<`void`>

#### Example

```
await reddit.modMail.unreadConversations(['abcdef', 'qwerty']);
```


<!-- ============ /docs/api/redditapi/models/classes/Listing ============ -->

> source: https://developers.reddit.com/docs/api/redditapi/models/classes/Listing

- 
- Reddit API
- Classes
- Listing

# Listing
@devvit/public-api v0.12.23-dev

# Class: Listing<T>

## Type Parameters

### T

`T`

## Properties

### limit

limit: `number` = `DEFAULT_LIMIT`

### pageSize

pageSize: `number` = `DEFAULT_PAGE_SIZE`

## Accessors

### hasMore

#### Get Signature

get hasMore(): `boolean`

##### Returns

`boolean`

## Methods

### [asyncIterator]()

[asyncIterator](): `AsyncIterator`<`T`>

#### Returns

`AsyncIterator`<`T`>

### all()

all(): `Promise`<`T`[]>

#### Returns

`Promise`<`T`[]>

### get()

get(`count`): `Promise`<`T`[]>

#### Parameters

##### count

`number`

#### Returns

`Promise`<`T`[]>

### preventInitialFetch()

preventInitialFetch(): `void`

#### Returns

`void`

### setMore()

setMore(`more`): `void`

#### Parameters

##### more

`undefined` | `MoreObject`

#### Returns

`void`


<!-- ============ /docs/api/redditapi/models/classes/User ============ -->

> source: https://developers.reddit.com/docs/api/redditapi/models/classes/User

- 
- Reddit API
- Classes
- User

# User
@devvit/public-api v0.12.23-dev

# Class: User

A class representing a user.

## Accessors

### about

#### Get Signature

get about(): `string`

The user's public description about themselves. May be empty.

##### Returns

`string`

### commentKarma

#### Get Signature

get commentKarma(): `number`

The amount of comment karma the user has.

##### Returns

`number`

### createdAt

#### Get Signature

get createdAt(): `Date`

The date the user was created.

##### Returns

`Date`

### displayName

#### Get Signature

get displayName(): `string`

The display name of the user. May be different from their username.

##### Returns

`string`

### hasRedditPremium

#### Get Signature

get hasRedditPremium(): `boolean`

Whether the user has Reddit Premium.

##### Returns

`boolean`

### hasVerifiedEmail

#### Get Signature

get hasVerifiedEmail(): `boolean`

Indicates whether or not the user has verified their email address.

##### Returns

`boolean`

### id

#### Get Signature

get id(): ``t2_${string}``

The ID (starting with t2_) of the user to retrieve.

##### Example

```
't2_1w72'
```

##### Returns

``t2_${string}``

### isAdmin

#### Get Signature

get isAdmin(): `boolean`

Whether the user is admin.

##### Returns

`boolean`

### isModerator

#### Get Signature

get isModerator(): `boolean`

Whether the user is a moderator of any subreddit.

##### Returns

`boolean`

### linkKarma

#### Get Signature

get linkKarma(): `number`

The amount of link karma the user has.

##### Returns

`number`

### modPermissions

#### Get Signature

get modPermissions(): `Map`<`string`, `ModeratorPermission`[]>

The permissions the user has on the subreddit.

##### Returns

`Map`<`string`, `ModeratorPermission`[]>

### nsfw

#### Get Signature

get nsfw(): `boolean`

Whether the user's profile is marked as NSFW (Not Safe For Work).

##### Returns

`boolean`

### permalink

#### Get Signature

get permalink(): `string`

Returns a permalink path relative to https://www.reddit.com

##### Returns

`string`

### showNsfw

#### Get Signature

get showNsfw(): `boolean`

Whether the user is over 18 and wishes to see NSFW content.

##### Returns

`boolean`

### url

#### Get Signature

get url(): `string`

Returns the HTTP URL for the user

##### Returns

`string`

### username

#### Get Signature

get username(): `string`

The username of the user omitting the u/.

##### Example

```
'spez'
```

##### Returns

`string`

## Methods

### getComments()

getComments(`options`): `Listing`<`Comment`>

Get the user's comments.

#### Parameters

##### options

`Omit`<`GetCommentsByUserOptions`, `"username"`>

Options for the request

#### Returns

`Listing`<`Comment`>

A Listing of Comment objects.

### getModPermissionsForSubreddit()

getModPermissionsForSubreddit(`subredditName`): `Promise`<`ModeratorPermission`[]>

Get the mod permissions the user has on the subreddit if they are a moderator.

#### Parameters

##### subredditName

`string`

name of the subreddit

#### Returns

`Promise`<`ModeratorPermission`[]>

the moderator permissions the user has on the subreddit

### getPosts()

getPosts(`options`): `Listing`<`Post`>

Get the user's posts.

#### Parameters

##### options

`Omit`<`GetPostsByUserOptions`, `"username"`>

Options for the request

#### Returns

`Listing`<`Post`>

A Listing of Post objects.

### getSnoovatarUrl()

getSnoovatarUrl(): `Promise`<`undefined` | `string`>

#### Returns

`Promise`<`undefined` | `string`>

### getSocialLinks()

getSocialLinks(): `Promise`<`UserSocialLink`[]>

Gets social links of the user

#### Returns

`Promise`<`UserSocialLink`[]>

A Promise that resolves an Array of UserSocialLink objects

#### Example

```
const socialLinks = await user.getSocialLinks();
```

### getTrophies()

getTrophies(): `Promise`<`Trophy`[]>

Get the trophies displayed on this user's profile.

#### Returns

`Promise`<`Trophy`[]>

A Promise that resolves to an array of Trophy objects.

### getUserFlairBySubreddit()

getUserFlairBySubreddit(`subreddit`): `Promise`<`undefined` | `UserFlair`>

Retrieve the user's flair for the subreddit.

#### Parameters

##### subreddit

`string`

The name of the subreddit associated with the user's flair.

#### Returns

`Promise`<`undefined` | `UserFlair`>

#### Example

```
const username = "badapple"const subredditName = "mysubreddit"const user = await reddit.getUserByUsername(username);const userFlair = await user.getUserFlairBySubreddit(subredditName);
```

### getUserKarmaFromCurrentSubreddit()

getUserKarmaFromCurrentSubreddit(): `Promise`<`GetUserKarmaForSubredditResponse`>

Returns the karma for this User in the current subreddit.
The user making the request must be a moderator of the subreddit to read another user's karma in the subreddit.
An exception is if the specified user is the same as the user making the request.

#### Returns

`Promise`<`GetUserKarmaForSubredditResponse`>

The GetUserKarmaForSubredditResponse, containing the user's karma for comments and posts in the subreddit.

### toJSON()

toJSON(): `Pick`<`User`, `"username"` | `"id"` | `"createdAt"` | `"nsfw"` | `"linkKarma"` | `"commentKarma"`> & `object`

#### Returns

`Pick`<`User`, `"username"` | `"id"` | `"createdAt"` | `"nsfw"` | `"linkKarma"` | `"commentKarma"`> & `object`