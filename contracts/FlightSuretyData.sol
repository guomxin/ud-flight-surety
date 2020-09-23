pragma solidity ^0.4.25;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract FlightSuretyData {
    using SafeMath for uint256;

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    address private contractOwner;                                      // Account used to deploy contract
    bool private operational = true;                                    // Blocks all state changes throughout the contract if false

    mapping(address => bool) authorizedCallers;                         // Record authorized callers

    address[] registeredAirlines;
    mapping(address => bool) registered;

    struct PassengerInsurance {
        bool registered;
        bool isAlreadyCredited;
        uint256 amount;
    }
    mapping(address => mapping(bytes32 => PassengerInsurance)) passenger2FlightInsurances;
    mapping(address => uint256) passengerCredit;

    mapping(bytes32 => address[]) flight2InsuredPassengers;
    mapping(address => uint256) airlineContributions;

    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/


    /**
    * @dev Constructor
    *      The deploying account becomes contractOwner
    */
    constructor(address firstAirlineAdr) public {
        contractOwner = msg.sender;
        //register first airline
        registeredAirlines.push(firstAirlineAdr);
        registered[firstAirlineAdr] = true;
    }

    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    // Modifiers help avoid duplication of code. They are typically used to validate something
    // before a function is allowed to be executed.

    /**
    * @dev Modifier that requires the "operational" boolean variable to be "true"
    *      This is used on all state changing functions to pause the contract in 
    *      the event there is an issue that needs to be fixed
    */
    modifier requireIsOperational() 
    {
        require(operational, "Contract is currently not operational");
        _;  // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
    * @dev Modifier that requires the "ContractOwner" account to be the function caller
    */
    modifier requireContractOwner()
    {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    modifier requireAuthorizedCaller() {
        require(authorizedCallers[msg.sender] == true, "Caller is not authorized");
        _;
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    function authorizeCaller(address contractAddress) external 
        requireContractOwner
    {
        authorizedCallers[contractAddress] = true;
    }

    function deAuthorizeCaller(address contractAddress) external
        requireContractOwner
    {
        delete authorizedCallers[contractAddress];
    }

    function isCallerAuthorized(address contractAddress)
        external
        view
        returns (bool)
    {
        return authorizedCallers[contractAddress];
    }

    /**
    * @dev Get operating status of contract
    *
    * @return A bool that is the current operating status
    */      
    function isOperational() 
                            external 
                            view 
                            returns(bool) 
    {
        return operational;
    }


    /**
    * @dev Sets contract operations on/off
    *
    * When operational mode is disabled, all write transactions except for this one will fail
    */    
    function setOperatingStatus
                            (
                                bool mode
                            ) 
                            external
                            requireContractOwner 
    {
        require(
            mode != operational,
            "this is already the existing state of the contract"
        );
        operational = mode;
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

   /**
    * @dev Add an airline to the registration queue
    *      Can only be called from FlightSuretyApp contract
    *
    */   
    function registerAirline(address airlineAddress)
        external
        requireIsOperational
        requireAuthorizedCaller
        returns (bool)
    {
        require(
            airlineAddress != address(0),
            "not a valid address for registering airline"
        );
        require(!registered[airlineAddress], "airline already registered");

        registeredAirlines.push(airlineAddress);
        registered[airlineAddress] = true;
        return true;
    }

    function isRegistered(address airlineAddress) external view returns (bool) {
        return registered[airlineAddress];
    }

    function getRegAirlineCount()
        external
        view
        requireAuthorizedCaller
        returns (uint256)
    {
        return registeredAirlines.length;
    }


    function getPassengerBalance(address passenger)
        external
        view
        requireAuthorizedCaller
        returns (uint256)
    {
        return passengerCredit[passenger];
    }

    function getAirlineBalance(address airline)
        external
        view
        requireAuthorizedCaller
        returns (uint256)
    {
        return airlineContributions[airline];
    }

    function withdrawFunds(address passenger, uint256 amountToWithdraw)
        external
        requireAuthorizedCaller
        returns (uint256)
    {
        require(
            passengerCredit[passenger] >= amountToWithdraw,
            "Withdraw amount exceeds passenger balance"
        );

        passengerCredit[passenger] = passengerCredit[passenger].sub(
            amountToWithdraw
        );

        //credit passenger
        passenger.transfer(amountToWithdraw);

        //return remaining passenger balance
        return passengerCredit[passenger];
    }

    function getRegisteredAirlines()
        external
        view
        requireAuthorizedCaller
        returns (address[] memory)
    {
        return registeredAirlines;
    }

   /**
    * @dev Buy insurance for a flight
    *
    */   
   function buy(
        address airline,
        string flightName,
        uint256 timestamp,
        address passenger,
        uint256 amount
    ) external  requireIsOperational requireAuthorizedCaller {
        bytes32 flightKey = getFlightKey(airline, flightName, timestamp);
        require(
            !passenger2FlightInsurances[passenger][flightKey].registered,
            "already bought insurance"
        );

        // Add passenger info for the flight
        passenger2FlightInsurances[passenger][flightKey].amount = amount;
        passenger2FlightInsurances[passenger][flightKey].registered = true;

        // Add passengers who are insured
        flight2InsuredPassengers[flightKey].push(passenger);
    }

    function getInsuredPassengersByFlight(
        address airline,
        string flightName,
        uint256 timestamp
    ) internal view requireAuthorizedCaller returns (address[] memory) {
        bytes32 flightKey = getFlightKey(airline, flightName, timestamp);
        return flight2InsuredPassengers[flightKey];
    }

    function getAmountInsuredByPassenger(
        address airline,
        string flightName,
        uint256 timestamp,
        address passenger
    ) internal view requireAuthorizedCaller returns (uint256 amount) {
        bytes32 flightKey = getFlightKey(airline, flightName, timestamp);
        return passenger2FlightInsurances[passenger][flightKey].amount;
    }

    function isFlightInsuredByPassenger(
        address airline,
        string flightName,
        uint256 timestamp,
        address passenger
    ) external view requireIsOperational requireAuthorizedCaller returns (bool) {
        return passenger2FlightInsurances[passenger][getFlightKey(
            airline,
            flightName,
            timestamp)].registered;
    }


    /**
     *  @dev Credits payouts to insurees
    */
    function creditInsurees(
        address airline,
        string flightName,
        uint256 timestamp,
        uint256 multiplier,
        uint256 dividend
    ) external requireIsOperational requireAuthorizedCaller {
        bytes32 flightKey = getFlightKey(airline, flightName, timestamp);
        
        // Find passengers who are affected by the flight
        address[] memory insuredPassengers
            = getInsuredPassengersByFlight(airline, flightName, timestamp);
        // Credit accounts of insurees
        for (uint256 i = 0; i < insuredPassengers.length; i++) {
            // Get amount paid by insuree for the flight
            address passenger = insuredPassengers[i];
            if (!passenger2FlightInsurances[passenger][flightKey].isAlreadyCredited) {
                uint256 insuredAmount
                    = passenger2FlightInsurances[passenger][flightKey].amount;
                uint256 amountToCredit = (insuredAmount.mul(multiplier)).div(dividend);
                passengerCredit[passenger] = passengerCredit[passenger].add(amountToCredit);
                passenger2FlightInsurances[passenger][flightKey].isAlreadyCredited = true;
            }
        }
    }
    
    /**
     *  @dev Transfers eligible payout funds to insuree
     *
    */
    // function pay(uint256 amount, address insuree)
    //     external
    //     requireIsOperational
    //     requireAuthorizedCaller
    // {
    //     // Payout the insuree
    //     insuree.transfer(amount);
    // }

   /**
    * @dev Initial funding for the insurance. Unless there are too many delayed flights
    *      resulting in insurance payouts, the contract should be self-sustaining
    *
    */   
    function fund(address airline, uint256 amount)
        external
        requireIsOperational
        requireAuthorizedCaller
    {
        airlineContributions[airline] = airlineContributions[airline].add(amount);
    }

    function getFunding(address airline)
        external
        view
        requireIsOperational
        requireAuthorizedCaller
        returns (uint256)
    {
        return airlineContributions[airline];
    }

    function getFlightKey
                        (
                            address airline,
                            string memory flight,
                            uint256 timestamp
                        )
                        pure
                        internal
                        returns(bytes32) 
    {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    /**
    * @dev Fallback function for funding smart contract.
    *
    */
    // function() 
    //                         external 
    //                         payable 
    // {
    //     fund();
    // }


}

