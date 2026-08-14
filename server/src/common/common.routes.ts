import express from 'express';

export abstract class CommonRoutes {
    app: express.Application;
    name: string;

    constructor(app: express.Application, name: string) {
        this.app = app;
        this.name = name;
        this.configureRoutes();
    }

    getName() {
        return this.name;
    }

  abstract configureRoutes(): express.Application;
}