
import DOM from './dom';
import Contract from './contract';
import './flightsurety.css';

import config from './config.json'
import Web3 from 'web3'
import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json'

(async () => {

    let result = null;

    let contract = new Contract('localhost', () => {

        // --- listen FlightStatusInfo events --- //
        let web3 = new Web3(
            new Web3.providers.WebsocketProvider(
                config['localhost'].url.replace('http', 'ws')
            )
        )
        web3.eth.defaultAccount = web3.eth.accounts[0]
        let flightSuretyApp = new web3.eth.Contract(
            FlightSuretyApp.abi,
            config['localhost'].appAddress
        )
        flightSuretyApp.events.FlightStatusInfo(
            {
                fromBlock: 0
            },
            (error, result) => {
                display('Oracles', 'Trigger oracles', [
                    {
                        label: 'Fetch Flight Status',
                        error: error,
                        value:
                            result.transactionHash +
                            ' ' +
                            result.returnValues.flight +
                            ' ' +
                            result.returnValues.timestamp +
                            ' ' +
                            getStatus(result.returnValues.status)
                    }
                ]);
            }
        );

        // Read transaction
        contract.isOperational((error, result) => {
            console.log(error, result);
            display('Operational Status', 'Check if contract is operational', [{ label: 'Operational Status', error: error, value: result }]);
        });


        // User-submitted transaction
        DOM.elid('submit-oracle').addEventListener('click', () => {
            let flight = DOM.elid('status-flight').value;
            let airline = DOM.elid('status-airline').value;
            let ts = DOM.elid('status-datepicker').value;
            let timestamp = new Date(ts).getTime() / 1000;
            // Write transaction
            contract.fetchFlightStatus(
                airline,
                flight,
                timestamp,
                (error, result) => {
                    display('Oracles', 'Trigger oracles', [
                        { label: 'Fetch Flight Status', error: error, value: error ? '' : 'Get flight status for ' + airline + '-' + flight + '-' + timestamp }]);
                });
        });

        // Register airline
        DOM.elid('register-airline').addEventListener('click', () => {
            let registeredAirline = DOM.elid('registered-airline').value;
            let airline = DOM.elid('airline-address').value;
            // Write transaction
            contract.registerAirline(registeredAirline, airline, (error, result) => {
                console.log(result);
                display('Airlines', 'Register airline', [
                    { label: 'Register status', error: error, value: error ? '' : 'Send register tx for ' + airline + '.' }]);
            });
        });

        // Fund airline
        DOM.elid('fund-airline').addEventListener('click', () => {
            let fundingAirline = DOM.elid('funding-airline').value;
            let ehterCount = DOM.elid('airline-funds').value;
            // Write transaction
            contract.fundAirline(fundingAirline, ehterCount, (error, result) => {
                display('Airlines', 'Fund airline', [
                    { label: 'Fund status', error: error, value: error ? '' : fundingAirline + ' funded ' + ehterCount + ' ethers.' }]);
            });
        });

        // Get registered airline count
        DOM.elid('getinfo-regairline').addEventListener('click', () => {
            contract.getRegisteredAirlines((error, result) => {
                DOM.elid('registered-airline-info').value = result;
                console.log(result);
                display('Airlines', 'Fund airline', [
                    { label: 'Fund status', error: error, value: 'Registered airline count: ' + result.length }]);
            });
        });

        // purchase insurance for flight
        DOM.elid('purchase-insurance').addEventListener('click', () => {
            let airline = DOM.elid('insurance-airline').value;
            let flight = DOM.elid('insurance-flight').value;
            let funds = DOM.elid('insurance-value').value;
            let passenger = DOM.elid('insurance-passenger').value;
            let ts = DOM.elid('insurance-datepicker').value;
            let timestamp = new Date(ts).getTime() / 1000;

            // Write transaction
            contract.purchaseInsurance(
                airline,
                flight,
                timestamp,
                passenger,
                funds,
                (error, result) => {
                    display('Passenger', 'Purchase Insurance', [
                        { label: 'Purchase Insurance', error: error, value: error ? '' : 'Buy ' + funds + ' ether insurance for ' + passenger }
                    ])
                }
            );
        });

        // Get passenger balance
        DOM.elid('getbalance-passenger').addEventListener('click', () => {
            let passenger = DOM.elid('balance-passenger').value;
            contract.getPassengerBalance(passenger, (error, result) => {
                display('Passenger', 'Get balance', [
                    { label: 'Passenger balance', error: error, value: error ? '' : 'Balance ' + passenger + ': ' + contract.web3.utils.fromWei(result) + ' ethers.' }]);
            });
        });

        // withdraw balance for passenger
        DOM.elid('withdraw-funds').addEventListener('click', () => {
            let funds = DOM.elid('withdraw-amount').value;
            let passenger = DOM.elid('withdraw-passenger').value;

            // Write transaction
            contract.withdrawFunds(passenger, funds, (error, result) => {
                display('Withdraw', 'Withdraw Funds', [
                    { label: 'Withdraw Funds', error: error, value: result }
                ]);
            });
        });

    });


})();


function display(title, description, results) {
    let displayDiv = DOM.elid("display-wrapper");
    let section = DOM.section();
    section.appendChild(DOM.h2(title));
    section.appendChild(DOM.h5(description));
    results.map((result) => {
        let row = section.appendChild(DOM.div({ className: 'row' }));
        row.appendChild(DOM.div({ className: 'col-sm-4 field' }, result.label));
        row.appendChild(DOM.div({ className: 'col-sm-8 field-value' }, result.error ? String(result.error) : String(result.value)));
        section.appendChild(row);
    })
    displayDiv.append(section);

}

function getStatus(status) {
    switch (status) {
        case '10':
            return 'STATUS_CODE_ON_TIME'
        case '20':
            return 'STATUS_CODE_LATE_AIRLINE'
        case '30':
            return 'STATUS_CODE_LATE_WEATHER'
        case '40':
            return 'STATUS_CODE_LATE_TECHNICAL'
        case '50':
            return 'STATUS_CODE_LATE_OTHER'
        case '0':
            return 'STATUS_CODE_UNKNOWN'
    }
}







