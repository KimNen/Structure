/**
 * Created by TH on 2018-04-03.
 */

import React from 'react';

const electron = require('electron');
const electron_flux = require('electron_flux');
import ReactImageNaturalView from '../../../../../utils/ReactImageNaturalView';
import { imageUtil } from '../../../../../utils/imageUtil';

export default class GroupCell extends React.Component {
    constructor(props) {
        try{
            super(props);

            this.groupInfoModel = this.props.additionalInfoObj.groupInfoModel;
            this.groupMemberModel = this.props.additionalInfoObj.groupMemberModel;

            this.state = {  
                GroupBackgroundImageSrc : imageUtil.getImageUrl(this.props.data.group_unique_id, this.props.data.group_profile_img, 'group_profile', 200, 200),
                OwnerProfileImageSrc : imageUtil.getImageUrl(this.props.data.owner_unique_id, this.props.data.owner_img, 'profile'),
                BackPicError : false,
                OwnerPicError : false,
            }
            this.owner_nick = this.props.data.owner_nick,
            this.errorImage = imageUtil.getStoredImageResource('error')
            console.log("GroupCell constructor",this.props);
            console.log("GroupCell constructor ownerProfile : ",this.props.ownerProfile);
        } catch(err){
            console.log('GroupCell constructor err : ', err);
            return null
        }

    }

    componentDidMount(){
    }

    componentWillUnmount(){

    }

    componentWillReceiveProps(nextProps){
        if(this.props.data.owner_img !== nextProps.data.owner_img 
            || this.props.data.group_profile_img !== nextProps.data.group_profile_img){
            this.setState({
                GroupBackgroundImageSrc : imageUtil.getImageUrl(nextProps.data.group_unique_id, nextProps.data.group_profile_img, 'group_profile', 200, 200),
                OwnerProfileImageSrc : imageUtil.getImageUrl(nextProps.data.owner_unique_id, nextProps.data.owner_img, 'profile'),
            })
        }
    }

    ownerImageError() {
        this.setState({
            OwnerPicError : true,
        });
    }

    backgroundImageError() {
        this.setState({
            BackPicError : true,
        });
    }

    backgroundProfileClick(){
        console.log("GroupCell backgroundProfileClick",this.props.data.group_nick,"그룹의 배경사진이 눌렸습니다.");
        electron_flux.rendererAction.updateStore('groupHomeDialog', this.props.data.group_unique_id);
    }

    ProfileImageClick(){
        console.log("GroupCell ProfileImageClick",this.props.data.group_nick,"그룹의 오너의 프로필사진이 눌렸습니다.");
    }

    render() {
        try{

            return (
                <div className="GroupCell">
                    <div className="GroupCellContentsWrap">
                        <img className="GroupBackgroundImage" onError={this.backgroundImageError.bind(this)}
                            onClick={this.backgroundProfileClick.bind(this)}
                            src={this.state.BackPicError ? this.errorImage : this.state.GroupBackgroundImageSrc} />

                        <div className="GroupInfoContainer">
                            <div className="GroupName">
                                {this.props.data.group_nick}
                            </div>
                            <div className="GroupInfo">
                                <div className="groupOwnerinfo">
                                    <img className="OwnerProfileImage" onError={this.ownerImageError.bind(this)}
                                        onClick={this.ProfileImageClick.bind(this)}
                                        src={this.state.OwnerPicError ? this.errorImage : this.state.OwnerProfileImageSrc}/>
                                    <div className="OwnerName">
                                        {this.owner_nick}
                                    </div>
                                </div>
                                <div className="groupMembercount">
                                    {this.props.data.group_member_count}명
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            );

        } catch(err){
            console.log('GroupCell render err : ', err);
            return null
        }

    }

}

