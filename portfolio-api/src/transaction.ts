/*
 *  Copyright 2025 Curity AB
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

export class Transaction {
    public readonly id: number;
    public readonly stockId: string;
    public readonly delta: number;
    public readonly personalNumber: string;
    public readonly createdAt: number;

    constructor(id: number, stockId: string, delta: number, personalNumber: string, createdAt: number) {
        this.id = id;
        this.stockId = stockId;
        this.delta = delta;
        this.personalNumber = personalNumber;
        this.createdAt = createdAt;
    }
}