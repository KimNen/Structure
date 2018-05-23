

/**
 * Created by lente on 2017-07-11.
 */

// edit by TH on 2018/04/03

import React from 'react';
const electron = require('electron');
const ipcRenderer = electron.ipcRenderer;
const remote = require('electron').remote;
const main = remote.require('./main.js'); //경로 주의.
const electron_flux = require('electron_flux');
import GridViewByVirtual from '../../../AlwaysUseComponent/GridViewByVirtual';
import GroupSearchContainer from './groupList/GroupSearchContainer';
import PageLoading from './chatMessage/chatItems/PageLoading';
import GroupCell from './groupList/GroupCell'

export default class GroupListContainerByGrid extends React.Component {
    constructor(props) {
        try {
            super(props);

            this.groupInfoModel = electron_flux.getMainStoreObj().GroupInfoModel2
            this.groupMemberModel = electron_flux.getMainStoreObj().GroupMemberModel2

            this.state = {
                refreshWithSamePageTimestamp : new Date().getTime(),
                groupListOrSearch: electron_flux.getMainStoreObj().groupListOrSearch,
                additionalInfoObj: {
                    groupInfoModel: this.groupInfoModel,
                    groupMemberModel: this.groupMemberModel,
                },
            }

            this.gridItemsMap = new Map();
            this.gridItemsMap.set('group', GroupCell);

            this.GroupListChangedFunc = this.GroupListChanged.bind(this);
            this.groupListOrSearchChangedFunc = this.groupListOrSearchChanged.bind(this);

        } catch (err) {
            console.log('GroupListContainerByGrid constructor err : ', err);
            return null
        }

    }

    componentDidMount() {
        electron_flux.rendererProcess.addListener('groupListOrSearch', this.groupListOrSearchChangedFunc);
        electron_flux.rendererProcess.addListener('GroupInfoModel2',this.GroupListChangedFunc);
        electron_flux.rendererProcess.addListener('GroupMemberModel2',this.GroupListChangedFunc);
        electron_flux.rendererProcess.addListener('PublicSettingModel2',this.GroupListChangedFunc);
    }

    componentWillUnmount() {
        electron_flux.rendererProcess.removeListener('groupListOrSearch', this.groupListOrSearchChangedFunc);
        electron_flux.rendererProcess.removeListener('GroupInfoModel2',this.GroupListChangedFunc);
        electron_flux.rendererProcess.removeListener('GroupMemberModel2',this.GroupListChangedFunc);
        electron_flux.rendererProcess.removeListener('PublicSettingModel2',this.GroupListChangedFunc);
    }

    groupListOrSearchChanged(){
        this.setState({
            groupListOrSearch : electron_flux.getMainStoreObj().groupListOrSearch
        });
    }

    GroupListChanged() {
        console.log('GroupListContainerByGrid.js - GroupListChanged 실행 isScrolling : ', this.isScrolling);
        this.setState({
            refreshWithSamePageTimestamp : new Date().getTime()
        });
    }

    groupSearchClick() {
        electron_flux.rendererAction.updateStore('groupListOrSearch', 'groupSearch');
    }

    groupCreate() {
        electron_flux.rendererAction.updateStore('groupCreateDialog', 'open');
    }


    getPreviousGroupListWithRange(rangeNum, offSet) {

        let model;

        model = electron_flux.getMainStoreObj().GroupInfoModel2;

        return model.getPreviousGroupListWithRange(rangeNum, offSet)
    }

    getLaterGroupListWithRange(rangeNum, offSet) {

        let model;

        model = electron_flux.getMainStoreObj().GroupInfoModel2;

        return model.getLaterGroupListWithRange(rangeNum, offSet);

    }

    getSameRangeGroupList(rangeNum, offSet){
        console.log("getSameRangeGroupList in");
        let model;

        model = electron_flux.getMainStoreObj().GroupInfoModel2;

        return model.getSameRangeGroupList(rangeNum, offSet);
        
    }

    checkScrollStatus(isScrolling, top) {

        this.isScrolling = isScrolling;
        this.scrollGapToTop = top;

    }

    render() {
        console.log("checkScrollStatus",this.isScrolling)
        try {
            return (
                <div className="GroupListContainerByGrid">
                    {this.state.groupListOrSearch === 'groupList' ?
                        <GridViewByVirtual
                            rowsPerPage={72}
                            rowsPerSubPage={24}
                            keyword="group"
                            refreshWithSamePageTimestamp={this.state.refreshWithSamePageTimestamp}  //읽음 처리 갱신을 위해 현재 보는 화면에서 그대로 리프레쉬
                            gridItemsMap={this.gridItemsMap}
                            textforkey="group_unique_id"
                            cellWidth={234}
                            cellHeight={222}
                            class="GroupListWrap"
                            scrollGapToTop = {this.scrollGapToTop} 
                            additionalInfoObj={this.state.additionalInfoObj}
                            cellStyle={this.CellDivStyle}
                            getSameRangeGroupList = {this.getSameRangeGroupList}
                            getPreviousGroupListWithRange={this.getPreviousGroupListWithRange}  //상단으로 올라가는 중 
                            getLaterGroupListWithRange={this.getLaterGroupListWithRange}        //하단으로 내려가는 중
                            getGroupOwnerInfo = {this.getGroupOwnerInfo}
                            pageLoadingCompo={PageLoading}
                            checkScrollStatus={this.checkScrollStatus.bind(this)}
                        />
                        : <GroupSearchContainer />}

                    <img className="groupSearchImg cursorPointer"
                        onClick={this.groupSearchClick.bind(this)}
                        src={electron_flux.getMainStoreObj().rootDirectoryPath + '/images/button/friendAndGroup/tw_pc_search_btn.svg'} />

                    <img className="groupCreateImg cursorPointer"
                        src={electron_flux.getMainStoreObj().rootDirectoryPath + '/images/button/friendAndGroup/tw_pc_plus_btn.svg'}
                        onClick={this.groupCreate.bind(this)} />

                </div>
            );

        } catch (err) {
            console.log('GroupListContainerByGrid render err : ', err);
            return null
        }

    }

}