import { Typography } from '@mui/material';
import React from 'react';
import TextField from '@mui/material/TextField';
import Slider from '@mui/material/Slider';
import Button from '@mui/material/Button';
import SearchIcon from '@mui/icons-material/Search';
import ResetAltIcon from '@mui/icons-material/RestartAlt';
import GoogleMapReact from 'google-map-react';
// import LocationSearchingIcon from '@mui/icons-material/LocationSearching';
import LocationOnIcon from '@mui/icons-material/LocationOn';


export default class Map extends React.Component {

    constructor(props) {
        super();
        this.state = {
            latitude: 7.005314, 
            longitude: 125.087830,
            vendos: vendoData,
            selectedVendoId: null,
            markerClicked: false,
            searchText: "",
            distance: 40,
        }
    }

    componentDidMount = () => {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                console.log(position.coords)
                this.setState({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    vendos: vendoData
                })
            },
            (error) => {
                console.log("Error Getting Location: " + error.message)
            }
        )
    }

    header = () =>{
        const getDistanceFromLatLonInKm = (lat1, lon1, lat2, lon2) => {
            const deg2rad = (deg) => { return deg * (Math.PI / 180) }

            var R = 6371;
            var dLat = deg2rad(lat2 - lat1);
            var dLon = deg2rad(lon2 - lon1);
            var a =
                Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2)
                ;
            var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            var d = R * c;
            return d;

        }

        const handleSearch = () => {
            let filteredVendos = vendoData.filter(
                g => g.name.toLowerCase().includes(this.state.searchText.toLowerCase())
                &&
                (
                    getDistanceFromLatLonInKm(this.state.latitude, this.state.longitude, g.latitude, g.longitude) < this.state.distance
                )
            )
            this.setState({
                vendos: filteredVendos
            })
        }

        const resetAll = () => {
            this.setState({
                vendos: vendoData,
                distance: 40,
                searchText: "",
            })
        }

        return (
            <div>
                <div style={{ marginBottom: 10 }}>
                    <Typography variant='h4' style={{ textAlign: "center"}}>
                        V E N D O F I N D E R
                    </Typography>
                    <TextField label="Search for a Vendo..."
                        variant="outlined"
                        value={this.state.searchText}
                        style={{ width: "100%"}}
                        onChange={(event) => {this.setState({ searchText: event.target.value })}}
                    />
                    <div style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                        <Typography>
                            Distance:
                        </Typography>
                    <Slider style={{ width: "75%" }} 
                        value={this.state.distance}
                        valueLabelDisplay="auto"
                        step={5}
                        marks
                        min={0}
                        max={50}
                        onChange={(event, value) => {this.setState({distance: value})}}
                    />
                    </div>
                    <div>
                        <Button variant="outlined"
                            onClick={resetAll}
                            style={{ width: "50%"}}>
                                <ResetAltIcon/>
                                Reset</Button>

                        <Button variant="contained"
                            onClick={handleSearch}
                            style={{ width: "50%"}}>
                                <SearchIcon/>
                                Search</Button>
                    </div>
                </div>
            </div>
        )
    }

    map = () =>{
        const clickedOutside = (x, y, lat, lng, event) =>  {
            if (this.state.markerClicked === true) {
                this.setState({
                    selectedVendoId: null,
                    markerClicked: false
                })
            }
            else {
                console.log("Clicked on map")
            }
        }

        const handleVendoClick = (vendo) => {
            window.location.replace("/vendo/" + vendo.id)
        }

        return (
            <div>
                <div style={{ height: "80vh" }}>
                <GoogleMapReact
                    bootstrapURLKeys={{ key: process.env.REACT_APP_GOOGLE_MAPS_API_KEY }}
                    defaultCenter={{
                        lat: 10.99835602,
                        lng: 77.01502627
                      }}
                    defaultZoom={14}
                    center={{lat: this.state.latitude, lng: this.state.longitude}}
                    onClick={clickedOutside}
                >
                    {
                        this.state.vendos.map((vendo) => {
                            return (
                                <LocationOnIcon style={{ color: '#db1709' }}
                                    lat={vendo.latitude}
                                    lng={vendo.longitude}
                                    onClick={() => {this.setState({ selectedVendoId: vendo.id, markerClicked: true})}}
                                />
                            )
                        })
                    }
                    {
                        this.state.vendos.map((vendo) => {
                            if (this.state.selectedVendoId === vendo.id) {
                                return (
                                    <div  lat={vendo.latitude}
                                    lng={vendo.longitude}
                                    onClick={() => {handleVendoClick(vendo)}}
                                    style={{ backgroundColor: "white", width: 100}}
                                    >
                                        <Typography>
                                            {vendo.name}
                                        </Typography>
                                    </div>
                                )
                            }
                            else {
                                return null
                            }
                        })
                    }
                    {/* <LocationSearchingIcon color={"primary"}
                    lat={this.state.latitude}
                    lng={this.state.longitude}
                    /> */}
                </GoogleMapReact>
                    </div>
            </div>
        )
    }

    render() {
        return (
            <div style={{ backgroundColor: "beige" }}>
                {this.header()}
                {this.map()}
            </div>
        )
    }
}

let vendoData = [
    {
        id: "4",
        name: "Osorio Diaper Vendo",
        latitude: 6.946384237309941,
        longitude: 124.88682823304704
    },
    // {
    //     id: "5",
    //     name: "University of Southern Mindanao - Kidapawan City Campus",
    //     latitude: 7.031171602271241,
    //     longitude: 125.11383375339688
    // },
]
