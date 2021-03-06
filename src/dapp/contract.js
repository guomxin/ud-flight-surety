import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import Config from './config.json';
import Web3 from 'web3';

export default class Contract {
    constructor(network, callback) {

        let config = Config[network];
        this.web3 = new Web3(new Web3.providers.HttpProvider(config.url));
        this.flightSuretyApp = new this.web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
        this.initialize(callback);
        this.owner = null;
        this.airlines = [];
        this.passengers = [];
    }

    initialize(callback) {
        this.web3.eth.getAccounts((error, accts) => {

            this.owner = accts[0];

            let counter = 1;

            while (this.airlines.length < 5) {
                this.airlines.push(accts[counter++]);
            }

            while (this.passengers.length < 5) {
                this.passengers.push(accts[counter++]);
            }

            callback();
        });
    }

    isOperational(callback) {
        let self = this;
        self.flightSuretyApp.methods
            .isOperational()
            .call({ from: self.owner }, callback);
    }

    fetchFlightStatus(airline, flight, timestamp, callback) {
        let self = this;
        let payload = {
            airline: airline,
            flight: flight,
            timestamp: timestamp
        }
        self.flightSuretyApp.methods
            .fetchFlightStatus(payload.airline, payload.flight, payload.timestamp)
            .send({ from: self.owner }, (error, result) => {
                callback(error, payload);
            });
    }

    registerAirline(registeredAirline, airlineToBeRegistered, callback) {
        let self = this;

        self.flightSuretyApp.methods
            .registerAirline(airlineToBeRegistered)
            .send(
                { from: registeredAirline, gas: 1000000 },
                (error, result) => {
                    callback(error, result)
                }
            );
    }

    fundAirline(airline, etherCount, callback) {
        let self = this;
        const fundAmount = self.web3.utils.toWei(etherCount, 'ether')
        self.flightSuretyApp.methods
            .fundAirline()
            .send(
                { from: airline, value: fundAmount},
                (error, result) => {
                    callback(error, result)
                }
            );
    }

    getRegisteredAirlines(callback) {
        let self = this;
        self.flightSuretyApp.methods
            .getRegisteredAirlines()
            .call({ from: self.owner }, callback);
    }

    purchaseInsurance(airline, flight, timestamp, passenger, funds, callback) {
        let self = this;
        const fundAmount = self.web3.utils.toWei(funds, 'ether');
        self.flightSuretyApp.methods
          .registerFlightInsurance(airline, flight, timestamp)
          .send(
            { from: passenger, value: fundAmount, gas: 1000000 },
            (error, result) => {
              callback(error, result)
            }
          );
    }

    getPassengerBalance(passenger, callback) {
        let self = this;
        self.flightSuretyApp.methods
            .getPassengerBalance()
            .call({ from: passenger }, callback);
    }

    withdrawFunds (passenger, funds, callback) {
        let self = this;
        const amount = self.web3.utils.toWei(funds, 'ether');
        self.flightSuretyApp.methods
          .withdrawFunds(amount)
          .send({ from: passenger}, (error, result) => {
            callback(error, result)
          });
    }

}